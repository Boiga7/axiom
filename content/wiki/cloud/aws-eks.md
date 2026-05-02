---
type: concept
category: cloud
para: resource
tags: [eks, kubernetes, node-groups, fargate-profiles, irsa, addons, eksctl, cdk]
sources: []
updated: 2026-05-01
tldr: "Managed Kubernetes on AWS: control plane management, node groups, Fargate profiles, and IRSA."
---

# Amazon EKS — Elastic Kubernetes Service

Managed Kubernetes on AWS: control plane management, node groups, Fargate profiles, and IRSA.

---

## EKS vs Self-Managed Kubernetes

```
EKS:
  Control plane: AWS managed (etcd, API server, scheduler) — $0.10/hour
  Node types: managed node groups (EC2) or Fargate profiles (serverless)
  Updates: one-click control plane upgrades, managed node group rolling updates
  Addons: CoreDNS, kube-proxy, VPC CNI, EBS CSI driver via AWS Managed Addons

Self-managed K8s (kops, kubeadm):
  Full control — including responsibility for etcd HA, API server certs, etc.
  Rarely worth it unless you need exotic configurations
  Choose EKS unless you have a specific reason not to
```

---

## EKS Cluster with CDK (Python)

```python
import aws_cdk as cdk
from aws_cdk import aws_eks as eks, aws_ec2 as ec2, aws_iam as iam

class EksStack(cdk.Stack):
    def __init__(self, scope, id, **kwargs):
        super().__init__(scope, id, **kwargs)

        vpc = ec2.Vpc(self, "VPC",
            max_azs=3,
            nat_gateways=1,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public", subnet_type=ec2.SubnetType.PUBLIC, cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Private", subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS, cidr_mask=22
                ),
            ],
        )

        # EKS cluster — control plane in private subnets
        cluster = eks.Cluster(self, "Cluster",
            version=eks.KubernetesVersion.V1_30,
            vpc=vpc,
            vpc_subnets=[ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS)],
            endpoint_access=eks.EndpointAccess.PRIVATE,  # API server not public
            default_capacity=0,  # we'll add managed node groups separately
        )

        # Managed node group — EC2 nodes with automatic replacement
        cluster.add_nodegroup_capacity("AppNodes",
            instance_types=[ec2.InstanceType("t3.medium")],
            desired_size=3,
            min_size=2,
            max_size=10,
            disk_size=50,
            ami_type=eks.NodegroupAmiType.AL2_X86_64,
            subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
            labels={"role": "app"},
        )

        # Fargate profile — serverless pods, no node management
        cluster.add_fargate_profile("BatchProfile",
            selectors=[
                eks.Selector(namespace="batch"),
                eks.Selector(namespace="jobs", labels={"type": "ephemeral"}),
            ],
            subnet_selection=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
        )
```

---

## IRSA — IAM Roles for Service Accounts

```
IRSA lets pods assume IAM roles without instance-level credentials.
Each service account gets its own IAM role with exactly the permissions it needs.
No EC2 instance profile credentials leaking across all pods on the node.
```

```python
# CDK — create an IRSA role for a pod that needs S3 access
s3_role = iam.Role(self, "AppS3Role",
    assumed_by=eks.ServiceAccountPrincipal(
        namespace="production",
        service_account="order-service",
        cluster=cluster,
    ),
)
s3_role.add_to_policy(iam.PolicyStatement(
    actions=["s3:GetObject", "s3:PutObject"],
    resources=["arn:aws:s3:::my-app-bucket/*"],
))

# Kubernetes ServiceAccount with the IAM role annotation
service_account = cluster.add_service_account("OrderServiceSA",
    name="order-service",
    namespace="production",
    annotations={"eks.amazonaws.com/role-arn": s3_role.role_arn},
)

# Pod spec — reference the service account
# No credentials in code; the mutating webhook injects the token
pod_spec = {
    "serviceAccountName": "order-service",
    # AWS SDK auto-discovers credentials via the projected token volume
}
```

---

## EKS Managed Addons

```python
# Install via CDK — managed addons get security patches automatically
eks.CfnAddon(self, "VpcCni",
    cluster_name=cluster.cluster_name,
    addon_name="vpc-cni",
    addon_version="v1.18.1-eksbuild.1",
    resolve_conflicts="OVERWRITE",
)

eks.CfnAddon(self, "EbsCsiDriver",
    cluster_name=cluster.cluster_name,
    addon_name="aws-ebs-csi-driver",
    addon_version="v1.30.0-eksbuild.1",
    service_account_role_arn=ebs_csi_role.role_arn,  # IRSA for EBS operations
)

eks.CfnAddon(self, "CoreDns",
    cluster_name=cluster.cluster_name,
    addon_name="coredns",
    addon_version="v1.11.1-eksbuild.9",
)
```

---

## eksctl Quick Reference

```bash
# Create cluster from config file
eksctl create cluster -f cluster.yaml

# cluster.yaml minimal config
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: my-cluster
  region: eu-west-1
  version: "1.30"
managedNodeGroups:
  - name: app-nodes
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 2
    maxSize: 10
    privateNetworking: true
    iam:
      withAddonPolicies:
        autoScaler: true
        albIngress: true
        cloudWatch: true

# Get kubeconfig
aws eks update-kubeconfig --name my-cluster --region eu-west-1

# Scale a node group
eksctl scale nodegroup --cluster my-cluster --name app-nodes --nodes 5

# Upgrade control plane
eksctl upgrade cluster --name my-cluster --version 1.30 --approve

# Delete cluster (and all node groups)
eksctl delete cluster --name my-cluster
```

---

## Cluster Autoscaler

```yaml
# Deploy Cluster Autoscaler — scales EC2 node groups based on pending pods
# Install via Helm
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName=my-cluster \
  --set awsRegion=eu-west-1 \
  --set rbac.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::ACCOUNT:role/ClusterAutoscalerRole

# The autoscaler IAM role needs:
# autoscaling:DescribeAutoScalingGroups
# autoscaling:DescribeAutoScalingInstances
# autoscaling:SetDesiredCapacity
# autoscaling:TerminateInstanceInAutoScalingGroup
# ec2:DescribeLaunchTemplateVersions
```

---

## Connections

[[cloud/cloud-hub]] · [[cloud/kubernetes]] · [[cloud/aws-fargate]] · [[cloud/aws-cdk]] · [[cloud/github-actions]] · [[cloud/argocd]] · [[cloud/keda]]
