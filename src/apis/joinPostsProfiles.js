import fs from "fs";
import path from "path";

const rootDir = "/Users/yang-eunji/Documents/projects/gentoo-sdk-web/src/apis";
const postResultsPath = path.join(rootDir, "postResults.json");
const profileResultsPath = path.join(rootDir, "profileResults.json");
const outCsvPath = path.join(rootDir, "post_profile_join.csv");
const outDdlPath = path.join(rootDir, "post_profile_join.ddl.sql");

function readJsonArray(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  // The files are arrays of { success, postId/profileId, data }
  return JSON.parse(raw);
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const asString = String(value);
  // Replace CRLF and CR with LF for consistency
  const normalized = asString.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Escape inner quotes by doubling them
  const escaped = normalized.replace(/"/g, '""');
  // Wrap everything in quotes to preserve commas/newlines
  return `"${escaped}"`;
}

function toDateTime(value) {
  if (!value) return "";
  // Expecting "YYYY-MM-DD HH:mm:ss" already; just pass through
  return value;
}

function buildProfileMap(profileResults) {
  const map = new Map();
  for (const item of profileResults) {
    if (!item || item.success !== true || !item.data) continue;
    const profileId = String(item.data.profile_id ?? item.profileId ?? "");
    if (!profileId) continue;
    map.set(profileId, {
      profile_id: profileId,
      username: item.data.username ?? "",
      description: item.data.description ?? "",
      summary: item.data.summary ?? ""
    });
  }
  return map;
}

function main() {
  const posts = readJsonArray(postResultsPath);
  const profiles = readJsonArray(profileResultsPath);
  const profileMap = buildProfileMap(profiles);

  // CSV header
  const headers = [
    "profile_id",
    "username",
    "profile_description",
    "profile_summary",
    "post_caption",
    "post_summary",
    "posted_at"
  ];

  const lines = [headers.join(",")];

  for (const item of posts) {
    if (!item || item.success !== true || !item.data) continue;
    const data = item.data;
    const profileId = String(data.profile_id ?? "");
    if (!profileId) continue;

    const profile = profileMap.get(profileId) ?? {
      profile_id: profileId,
      username: "",
      description: "",
      summary: ""
    };

    const row = [
      csvEscape(profile.profile_id),
      csvEscape(profile.username),
      csvEscape(profile.description),
      csvEscape(profile.summary),
      csvEscape(data.caption ?? ""),
      csvEscape(data.summary ?? ""),
      csvEscape(toDateTime(data.posted_at ?? ""))
    ].join(",");

    lines.push(row);
  }

  fs.writeFileSync(outCsvPath, lines.join("\n"), "utf8");

  const ddl = `-- MariaDB table for joined Instagram post/profile data
-- Import the CSV (${path.basename(outCsvPath)}) via Sequel Ace: Table → Import CSV
-- Ensure character set is utf8mb4 for full Unicode (e.g., Korean)

CREATE TABLE IF NOT EXISTS instagram_posts_profiles (
  profile_id BIGINT NOT NULL,
  username VARCHAR(255) NULL,
  profile_description MEDIUMTEXT NULL,
  profile_summary MEDIUMTEXT NULL,
  post_caption MEDIUMTEXT NULL,
  post_summary MEDIUMTEXT NULL,
  posted_at DATETIME NULL,
  PRIMARY KEY (profile_id, posted_at)
) CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci;
`;
  fs.writeFileSync(outDdlPath, ddl, "utf8");

  console.log("Generated:");
  console.log(`- ${outCsvPath}`);
  console.log(`- ${outDdlPath}`);
}

main();


