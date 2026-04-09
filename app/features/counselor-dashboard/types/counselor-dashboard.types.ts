export type CounselorTabKey = 'overview' | 'students' | 'checklists' | 'documents' | 'invites';

export type Student = {
  id: string;
  name: string;
  email: string;
  grade: 'Junior' | 'Senior';
  collegesSaved: number;
  essaysCompleted: number;
  totalEssays: number;
  applicationStatus: 'Not Started' | 'In Progress' | 'Submitted';
  lastActive: string;
};

export type StudentTask = {
  id: string;
  studentId: string;
  title: string;
  deadline: string;
  completed: boolean;
  category: 'Application' | 'Essay' | 'Testing' | 'Financial Aid' | 'General';
};

export type Checklist = {
  id: string;
  title: string;
  description: string;
  assignedStudents: number;
};

export type Document = {
  id: string;
  title: string;
  category: 'Essays' | 'Testing' | 'Financial Aid' | 'General';
  fileType: 'PDF' | 'DOC' | 'XLSX' | 'Link';
  uploadedAt: string;
};

export type DashboardStats = {
  totalStudents: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  overdueCount: number;
  highRiskCount: number;
};
