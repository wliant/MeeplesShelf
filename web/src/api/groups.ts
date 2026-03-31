import client from "./client";
import type { PlayerGroup } from "../types/group";

export const listGroups = () =>
  client.get<PlayerGroup[]>("/groups").then((r) => r.data);

export const createGroup = (name: string) =>
  client.post<PlayerGroup>("/groups", { name }).then((r) => r.data);

export const updateGroup = (id: number, name: string) =>
  client.put<PlayerGroup>(`/groups/${id}`, { name }).then((r) => r.data);

export const deleteGroup = (id: number) => client.delete(`/groups/${id}`);

export const addGroupMember = (groupId: number, playerId: number) =>
  client.post(`/groups/${groupId}/members/${playerId}`);

export const removeGroupMember = (groupId: number, playerId: number) =>
  client.delete(`/groups/${groupId}/members/${playerId}`);
