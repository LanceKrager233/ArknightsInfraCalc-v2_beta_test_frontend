import { getLocale } from "next-intl/server";
import PageClient from "./page-client";

export default PageClient;

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === "en" ? "Beginner Tutorials · Help Center" : "新手教程 · 使用帮助" };
}
