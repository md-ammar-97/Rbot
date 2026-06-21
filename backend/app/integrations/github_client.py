import httpx
import base64

GITHUB_API   = "https://api.github.com"
TARGET_FILES = ["README.md", "readme.md", "CONTEXT.md", "CLAUDE.md"]
TARGET_DIRS  = ["docs", "documentation"]
MAX_FILES    = 10


def fetch_evidence_files(owner: str, repo: str, token: str | None = None) -> list[dict]:
    """Fetch README and docs from a GitHub repo via the Contents API."""
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    files_found = []

    # Root-level files (break after first README found)
    for filename in TARGET_FILES:
        try:
            resp = httpx.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/contents/{filename}",
                headers=headers,
                timeout=15,
            )
            if resp.status_code == 200:
                data    = resp.json()
                content = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
                files_found.append({"path": filename, "content": content[:8000]})
                break
        except (httpx.HTTPError, httpx.TimeoutException):
            continue

    # docs/ directory (up to MAX_FILES total)
    for dir_name in TARGET_DIRS:
        if len(files_found) >= MAX_FILES:
            break
        try:
            resp = httpx.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/contents/{dir_name}",
                headers=headers,
                timeout=15,
            )
            if resp.status_code == 200:
                for item in resp.json():
                    if len(files_found) >= MAX_FILES:
                        break
                    if item.get("type") == "file" and item["name"].endswith(".md"):
                        try:
                            file_resp = httpx.get(item["download_url"], timeout=15)
                            if file_resp.status_code == 200:
                                files_found.append({
                                    "path":    item["path"],
                                    "content": file_resp.text[:6000],
                                })
                        except (httpx.HTTPError, httpx.TimeoutException):
                            continue
                break
        except (httpx.HTTPError, httpx.TimeoutException):
            continue

    return files_found
