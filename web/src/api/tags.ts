import client from "./client";
import type { Tag } from "../types/game";

export interface TagCreate {
  name: string;
}

export const listTags = () =>
  client.get<Tag[]>("/tags").then((r) => r.data);

export const createTag = (data: TagCreate) =>
  client.post<Tag>("/tags", data).then((r) => r.data);

export const deleteTag = (id: number) => client.delete(`/tags/${id}`);
