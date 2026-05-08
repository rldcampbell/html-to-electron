"use strict";

function readHtmlTitle(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);

  if (!match) {
    return "";
  }

  return decodeHtmlEntities(match[1]).replace(/\s+/g, " ").trim();
}

function deriveNames({ inputPath, htmlTitle, name, productName, bundleId }) {
  const filenameBase = getFilenameBase(inputPath);
  const sourceName = name || filenameBase;
  const slug = slugify(sourceName) || slugify(filenameBase) || "html-app";
  const packageName = toPackageName(name || slug);
  const displayName = cleanHumanName(productName || htmlTitle || name || humanizeSlug(slug));
  const appBundleId = toBundleId(bundleId || `com.local.${slug.replace(/-/g, "")}`);
  const executableName = slug;

  return {
    slug,
    packageName,
    productName: displayName,
    bundleId: appBundleId,
    executableName
  };
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function humanizeSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toPackageName(value) {
  const cleaned = slugify(value);
  const name = cleaned || "html-app";

  if (/^(node_modules|favicon\.ico)$/i.test(name)) {
    return `html-${name}`;
  }

  return name;
}

function toBundleId(value) {
  const fallback = "com.local.htmlapp";
  const raw = String(value || fallback).trim().toLowerCase();
  const parts = raw
    .split(".")
    .map((part) => part.replace(/[^a-z0-9-]/g, ""))
    .map((part) => part.replace(/^-+|-+$/g, ""))
    .filter(Boolean);

  if (parts.length < 2) {
    return fallback;
  }

  return parts
    .map((part) => (/^[a-z]/.test(part) ? part : `a${part}`))
    .join(".");
}

function cleanHumanName(value) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();

  return cleaned || "HTML App";
}

function getFilenameBase(inputPath) {
  const parts = String(inputPath || "").split(/[\\/]/);
  const filename = parts[parts.length - 1] || "html-app";

  return filename.replace(/\.[^.]+$/, "");
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

module.exports = {
  readHtmlTitle,
  deriveNames,
  slugify,
  humanizeSlug,
  toPackageName,
  toBundleId
};
