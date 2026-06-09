import { type User, type InsertUser } from "../shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByMobile(mobile: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.mobile === mobile,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      email: insertUser.email || null,
      termsAccepted: now,
      createdAt: now,
    };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
