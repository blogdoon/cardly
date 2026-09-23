export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: 'customer' | 'admin';
  createdAt: string;
  savedAddresses?: DeliveryAddress[];
}

export interface DeliveryAddress {
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  isDefault?: boolean;
}
