export type OrderStatus = "new" | "confirmed" | "printing" | "ready" | "done";
export type RequestStatus = "new" | "replied" | "added";

export type OrderColor = { name: string; hex: string; note: string };

export type Address = {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
};

export type Product = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  photo_url: string | null;
  sort_order: number;
};

export type FilamentColor = {
  id: string;
  name: string;
  hex: string;
  available: boolean;
  sort_order: number;
};

export type Order = {
  id: string;
  order_no: string;
  status: OrderStatus;
  product_name: string;
  size_label: string;
  qty: number;
  rush: boolean;
  resin: boolean;
  colors: OrderColor[];
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  method: "ship" | "pickup";
  address: Address | null;
  notes: string;
  total: number;
  tracking_number: string | null;
  placed_at: string;
};

export type CustomRequest = {
  id: string;
  request_no: string;
  status: RequestStatus;
  idea: string;
  colors: string;
  budget: string;
  suggested_price: number | null;
  customer_name: string;
  contact: string;
  photo_url: string | null;
  created_at: string;
};
