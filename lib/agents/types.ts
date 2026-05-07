export type SubTask = {
  id: string;
  title: string;
  brief: string;
  roleId: string;
};

export type WorkerResult = {
  task: SubTask;
  output: string;
};

export type Plan = {
  topic: string;
  subTasks: SubTask[];
};
