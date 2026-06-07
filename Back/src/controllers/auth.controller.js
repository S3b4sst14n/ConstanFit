import { z } from "zod";
import * as authService from "../services/auth.service.js";

const registerSchema = z.object({
  username: z.string().min(3).max(40),
  password: z.string().min(6).max(100),
  email: z.string().email(),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function register(req, res) {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);
  res.status(201).json(result);
}

export async function login(req, res) {
  const data = loginSchema.parse(req.body);
  const result = await authService.login(data);
  res.json(result);
}

export async function me(req, res) {
  const user = await authService.me(req.user.id);
  res.json({ user });
}
