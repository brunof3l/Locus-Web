export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isAdmin: boolean;
  createdAt: number;
}

export interface LocusItem {
  id?: string;
  assetCode: string;
  brand: string;
  description: string;
  createdBy: string;
  createdAt: number;
  calibrationDueDate: number | null;
  photoUrl?: string;
  // New fields
  model?: string;
  serialNumber?: string;
  location?: string;
  responsibleSector?: string;
  state?: string;
  notes?: string;
  descriptionLower?: string;
}
