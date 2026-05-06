---
type: concept
category: llms
para: resource
tags: [ml, supervised-learning, unsupervised-learning, reinforcement-learning, decision-trees, random-forests, xgboost, svm, k-means, neural-networks, aif-c01, clf-c02]
tldr: "Traditional ML foundations — supervised (regression, classification), unsupervised (clustering, dimensionality reduction), and RL — with key algorithms, evaluation metrics, and the ML lifecycle. AIF-C01 Domain 1 core."
sources: []
updated: 2026-05-06
---

# ML Fundamentals

> **TL;DR** Traditional ML foundations — supervised (regression, classification), unsupervised (clustering, dimensionality reduction), and RL — with key algorithms, evaluation metrics, and the ML lifecycle. AIF-C01 Domain 1 core.

AIF-C01 Domain 1 (AI/ML Fundamentals, 20% of exam) expects solid coverage of the three learning paradigms, how to select algorithms, and how to evaluate models. This page covers the traditional ML layer — neural networks and deep learning are in [[llms/transformer-architecture]]; inference-time scaling in [[llms/inference-time-scaling]].

---

## Three Learning Paradigms

| Paradigm | Has labels? | Goal | Examples |
|---|---|---|---|
| **Supervised** | Yes (labelled training data) | Learn input → output mapping | Classification, regression |
| **Unsupervised** | No | Find structure in unlabelled data | Clustering, dimensionality reduction |
| **Reinforcement** | No labels — reward signal | Agent maximises cumulative reward | Game-playing, robotics, RLHF |

**Exam trigger:** If a scenario gives you labelled data with a clear output to predict → supervised. If data has no labels and you want to discover patterns → unsupervised. If the problem involves sequential decisions and a reward → reinforcement learning.

---

## Supervised Learning

### Task Types

| Task | Output | Example |
|---|---|---|
| **Binary classification** | 0 or 1 | Spam or not spam |
| **Multi-class classification** | One of N classes | Image → dog / cat / bird |
| **Multi-label classification** | Multiple classes | Article → {sport, finance} |
| **Regression** | Continuous value | House price prediction |

### Key Algorithms

**Linear / Logistic Regression**
- Linear regression: fits a line (hyperplane) minimising mean squared error. Output is continuous.
- Logistic regression: applies sigmoid to linear output → probability between 0 and 1. Used for binary classification despite the name "regression."
- Interpretable; fast to train; assumes linear relationship between features and output.

**Decision Trees**
- Splits data recursively on the feature that maximises information gain (or Gini impurity reduction).
- Intuitive and interpretable. Prone to overfitting on deep trees.
- Exam note: a single deep decision tree overfits; ensemble methods (Random Forest, XGBoost) fix this.

**Random Forests**
- Ensemble of decision trees trained on random subsets of data and features (bagging).
- Each tree votes; majority wins for classification / average for regression.
- Reduces variance vs a single tree. Robust and accurate out-of-the-box.
- When the exam says "ensemble" or "bagging" → Random Forest.

**Gradient Boosting / XGBoost**
- Ensemble built sequentially: each tree corrects the residual errors of the previous.
- Boosting (sequential) vs bagging (parallel). XGBoost = optimised gradient boosted trees.
- Strong performance on structured/tabular data. AWS SageMaker's XGBoost is a built-in algorithm.
- When the exam says "boosting" or "tabular data with high accuracy" → XGBoost.

**Support Vector Machines (SVM)**
- Finds the maximum-margin hyperplane that separates classes.
- Kernel trick: maps data to higher-dimensional space to handle non-linear separation.
- Effective in high-dimensional spaces (text classification). Computationally expensive at scale.

**k-Nearest Neighbours (kNN)**
- Classifies a new point by the majority label among its k nearest training points.
- Non-parametric (no learned parameters). Slow at inference (scans all training data).
- Exam note: kNN is lazy learning — all computation happens at inference, not training.

**Naive Bayes**
- Applies Bayes' theorem assuming features are conditionally independent.
- Fast; effective for text classification (spam detection) despite the "naive" independence assumption.

---

## Unsupervised Learning

### Clustering

**k-Means**
- Partitions data into k clusters by minimising within-cluster variance.
- Algorithm: (1) initialise k centroids, (2) assign each point to nearest centroid, (3) update centroids, (4) repeat until convergence.
- Requires specifying k upfront. Sensitive to initialisation; use k-means++ to improve.
- AWS SageMaker built-in algorithm for k-means.

**Hierarchical Clustering**
- Builds a hierarchy (dendrogram) of clusters by repeatedly merging (agglomerative) or splitting (divisive) clusters.
- No need to specify k upfront; choose the cut point on the dendrogram.

**DBSCAN**
- Density-based clustering: groups points that are closely packed; marks outliers as noise.
- Does not require k; discovers clusters of arbitrary shape. Good for anomaly detection.

### Dimensionality Reduction

**PCA (Principal Component Analysis)**
- Finds orthogonal directions (principal components) that capture maximum variance.
- Used for visualisation (reduce to 2D/3D), noise reduction, and feature engineering before training.
- AWS SageMaker has a built-in PCA algorithm.

**t-SNE**
- Non-linear dimensionality reduction for visualisation only. Preserves local structure.
- Computationally expensive; not suitable for production inference.

---

## Reinforcement Learning

An **agent** takes **actions** in an **environment**, receives a **reward** signal, and learns a **policy** that maximises cumulative reward.

| Term | Meaning |
|---|---|
| Agent | The learner / decision-maker |
| Environment | The world the agent interacts with |
| State | The current situation |
| Action | What the agent does |
| Reward | Feedback signal (positive = good outcome) |
| Policy | The mapping from state to action |
| Value function | Expected cumulative reward from a state |

**Algorithms:**
- **Q-learning:** learns the value of (state, action) pairs; model-free.
- **Policy gradient (REINFORCE):** directly optimises the policy; used in RLHF for LLMs.
- **PPO (Proximal Policy Optimisation):** stable policy gradient algorithm; used in InstructGPT and Claude's RLHF training.

**Exam trigger:** "RLHF" → reinforcement learning from human feedback; the "HF" part uses supervised preference data to train a reward model, then PPO to optimise the LLM.

---

## Model Evaluation

### Classification Metrics

| Metric | Formula | When to prioritise |
|---|---|---|
| **Accuracy** | (TP + TN) / Total | Balanced classes |
| **Precision** | TP / (TP + FP) | False positives are costly (spam → miss real email) |
| **Recall** | TP / (TP + FN) | False negatives are costly (cancer detection → miss cancer) |
| **F1 Score** | 2 × (Precision × Recall) / (Precision + Recall) | Imbalanced classes, need balance of precision + recall |
| **AUC-ROC** | Area under the ROC curve | Ranking models; threshold-independent |

**Confusion matrix intuition:**
- TP: correctly predicted positive
- TN: correctly predicted negative
- FP: predicted positive, actually negative (false alarm)
- FN: predicted negative, actually positive (missed detection)

**Exam trap:** Accuracy is misleading on imbalanced datasets. A model that always predicts "not fraud" on a 99% not-fraud dataset has 99% accuracy but 0% recall for fraud. Use F1 or AUC-ROC instead.

### Regression Metrics

| Metric | What it measures | Notes |
|---|---|---|
| **MAE** (Mean Absolute Error) | Average absolute deviation | Robust to outliers |
| **MSE** (Mean Squared Error) | Average squared deviation | Penalises large errors more |
| **RMSE** | √MSE | Same units as the target variable |
| **R²** | Proportion of variance explained | 1.0 = perfect fit; 0 = no better than mean |

### Overfitting vs Underfitting

| Problem | Training error | Test error | Cause | Fix |
|---|---|---|---|---|
| **Underfitting** (high bias) | High | High | Model too simple | More features, more complex model |
| **Overfitting** (high variance) | Low | High | Model too complex | Regularisation, more data, simpler model |
| **Good fit** | Low | Low | — | — |

**Regularisation methods:**
- **L1 (Lasso):** adds |weights| penalty; drives some weights to zero (feature selection).
- **L2 (Ridge):** adds weights² penalty; shrinks all weights; prevents large coefficients.
- **Dropout** (neural networks): randomly drops neurons during training to prevent co-adaptation.
- **Early stopping:** stop training when validation loss starts increasing.

---

## The ML Lifecycle

```
Business Problem
      ↓
Data Collection → Data Preparation → Feature Engineering
      ↓
Model Selection → Training → Evaluation
      ↓
Hyperparameter Tuning → Re-evaluate
      ↓
Deployment → Monitoring → Retraining (data drift)
```

**Data preparation steps:** handle missing values, encode categoricals (one-hot, ordinal), normalise/standardise numerical features, split train/validation/test.

**Train/Val/Test split:** Typically 60/20/20 or 70/15/15. The test set must never be seen during training or hyperparameter tuning — it exists solely for final evaluation.

**Feature engineering:** creating new features from raw data (e.g., extracting day-of-week from a timestamp). Often more impactful than model selection.

**Hyperparameters** vs **parameters:**
- Parameters are learned during training (weights, biases).
- Hyperparameters are set before training (learning rate, number of trees, k in k-means).
- Tuned via grid search, random search, or Bayesian optimisation. SageMaker Automatic Model Tuning automates this.

---

## AWS SageMaker Built-In Algorithms

| Algorithm | Task | Notes |
|---|---|---|
| Linear Learner | Classification / regression | Optimised linear/logistic regression |
| XGBoost | Classification / regression | Industry-standard boosted trees |
| k-Means | Clustering | Standard k-means |
| PCA | Dimensionality reduction | |
| Object2Vec | Embeddings | General-purpose embedding learning |
| BlazingText | Text classification / word2vec | Fast NLP |
| Seq2Seq | Machine translation, summarisation | |
| DeepAR+ | Time series forecasting | Used by Amazon Forecast |
| Random Cut Forest | Anomaly detection | Streaming anomaly detection |
| IP Insights | IP anomaly detection | Security use cases |
| Factorisation Machines | Recommendation | Sparse data (click prediction) |

**Exam trigger:** "SageMaker built-in algorithm" → pick from above table. XGBoost for tabular, k-Means for clustering, DeepAR+ for time series, Random Cut Forest for anomaly detection.

---

## Key Facts

- Supervised learning requires labelled data; output is a prediction (class or value)
- Unsupervised learning discovers structure in unlabelled data — k-Means (clustering), PCA (dimensionality reduction)
- Reinforcement learning: agent maximises cumulative reward from environment feedback; PPO used in RLHF
- Random Forest = bagging (parallel trees); XGBoost = boosting (sequential, corrects errors)
- Precision vs Recall: precision = minimise false alarms; recall = minimise missed detections; F1 = harmonic mean
- Overfitting = low training error, high test error; fix with regularisation (L1/L2), dropout, early stopping, more data
- L1 (Lasso) drives weights to zero (feature selection); L2 (Ridge) shrinks weights without zeroing
- Hyperparameters set before training; SageMaker Automatic Model Tuning (AMT) automates search
- AUC-ROC: threshold-independent ranking metric; closer to 1.0 = better model discrimination
- kNN is lazy learning: no training phase; all compute at inference time

## Connections

- [[cloud/aws-sagemaker-studio]] — SageMaker training, deployment, and sub-services that operationalise ML lifecycle
- [[cloud/aws-ai-recognition-services]] — pre-built AWS AI APIs that skip model training entirely
- [[llms/transformer-architecture]] — how neural networks extend from these fundamentals into deep learning
- [[llms/inference-time-scaling]] — inference-time compute techniques built on top of trained models
- [[agents/practical-agent-design]] — agents built on top of ML models; RLHF is RL applied to LLM alignment
- [[landscape/aws-ai-practitioner]] — AIF-C01 study guide; Domain 1 covers this page directly

## Open Questions

- How does SageMaker Automatic Model Tuning (Bayesian optimisation) compare to manual grid search in practice for time/cost?
- When does XGBoost outperform deep learning on tabular data — is the "tabular = XGBoost" heuristic still accurate in 2026?
