import { Type } from "@google/genai";

export interface Schema {
    type: Type;
    description?: string;
    properties?: Record<string, Schema>;
    items?: Schema;
    required?: string[];
    propertyOrdering?: string[];
}

export interface FunctionDeclaration {
  name: string;
  description?: string;
  parameters: Schema;
}

export interface Row { [key:string]: any };

// Base types

export interface Column {
    id: string;
    name: string;
    type: 'TEXT' | 'NUMBER' | 'BOOLEAN';
}

export interface Table {
    schema: Column[];
    data: Row[];
}

export type Database = Record<string, Table>;

export interface Operation {
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    data?: Row;
    where?: Partial<Row>;
}

export interface ImageFile {
    name: string;
    type: string;
    base64Data: string;
}

export interface Icon extends Row {
    name: string;
    svg_content: string;
}


export interface Blob {
    data: string;
    mimeType: string;
}

