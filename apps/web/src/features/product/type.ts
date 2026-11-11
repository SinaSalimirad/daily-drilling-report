export type Product = {
    id: string;
    name: string;
    size: number;
    width?: number;
    height?: number;
    unit: "bbl" | "l" | "m³" | "kg" | "lb" | "ton" | "gal" | "m x m";
    specificGravity: string;
    origin: "local" | "foreign";
    price?: number;
    createdAt: Date;
    updatedAt: Date;
};

export type CreateProductInput = Omit<
    Product,
    "id" | "createdAt" | "updatedAt"
>;
