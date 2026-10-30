"""
Automated GitHub Deployer & GitHub Pages Enabler for Renova
Uses GitHub REST API (no local git executable required)
"""

import os
import sys
import json
import base64
import urllib.request
import urllib.error

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

IGNORE_DIRS = {
    ".git", ".next", "node_modules", ".gemini", ".zscripts",
    "download", "tests", "tool-results", "__pycache__", ".vscode"
}
IGNORE_FILES = {
    "dev.log", "server.log", "dev.pid", ".DS_Store", "bun.lock", ".env"
}

def github_request(url, token, method="GET", data=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Renova-Deployer"
    }
    encoded_data = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        encoded_data = json.dumps(data).encode("utf-8")

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_content)
        except Exception:
            err_json = {"message": err_content}
        return e.code, err_json

def get_files_to_upload(root_dir):
    file_list = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for f in filenames:
            if f in IGNORE_FILES or f.endswith(".log"):
                continue
            full_path = os.path.join(dirpath, f)
            rel_path = os.path.relpath(full_path, root_dir).replace("\\", "/")
            file_list.append((full_path, rel_path))
    return file_list

def deploy_to_github(token, repo_name, username=None, is_private=False):
    print("1. Validating GitHub credentials...", flush=True)
    status, user_info = github_request("https://api.github.com/user", token)
    if status != 200:
        print(f"Error: Invalid GitHub token or unauthorized. Status: {status}", flush=True)
        print("Details:", user_info, flush=True)
        return False

    owner = user_info.get("login")
    print(f"   Authenticated as: {owner}", flush=True)

    # 2. Check or create repository
    print(f"2. Checking repository '{owner}/{repo_name}'...", flush=True)
    repo_url = f"https://api.github.com/repos/{owner}/{repo_name}"
    status, repo_info = github_request(repo_url, token)

    if status == 404:
        print(f"   Repository does not exist. Creating '{repo_name}'...", flush=True)
        create_payload = {
            "name": repo_name,
            "description": "Renova — Modern Home Renovation Platform with SQLite Backend",
            "private": is_private,
            "auto_init": True
        }
        status, repo_info = github_request("https://api.github.com/user/repos", token, method="POST", data=create_payload)
        if status not in [200, 201]:
            print(f"Error creating repository: {repo_info}", flush=True)
            return False
        print("   Repository created successfully!", flush=True)
    elif status == 200:
        print(f"   Repository '{owner}/{repo_name}' found.", flush=True)
    else:
        print(f"Error checking repository: {repo_info}", flush=True)
        return False

    # 3. Collect files
    base_dir = os.path.dirname(os.path.abspath(__file__))
    files = get_files_to_upload(base_dir)
    print(f"3. Uploading {len(files)} project files...", flush=True)

    tree_items = []
    count = 0
    for full_path, rel_path in files:
        count += 1
        try:
            with open(full_path, "rb") as f:
                content = f.read()

            status, blob_info = github_request(
                f"https://api.github.com/repos/{owner}/{repo_name}/git/blobs",
                token,
                method="POST",
                data={
                    "content": base64.b64encode(content).decode("ascii"),
                    "encoding": "base64"
                }
            )
            if status in [200, 201]:
                tree_items.append({
                    "path": rel_path,
                    "mode": "100644",
                    "type": "blob",
                    "sha": blob_info["sha"]
                })
                if count % 15 == 0 or count == len(files):
                    print(f"   Progress: {count}/{len(files)} files uploaded...", flush=True)
            else:
                print(f"   Warning on {rel_path}: {blob_info}", flush=True)
        except Exception as e:
            print(f"   Error reading {rel_path}: {e}", flush=True)

    default_branch = repo_info.get("default_branch", "main")
    ref_url = f"https://api.github.com/repos/{owner}/{repo_name}/git/refs/heads/{default_branch}"
    status, ref_info = github_request(ref_url, token)
    parent_commits = []
    base_tree_sha = None
    if status == 200:
        parent_sha = ref_info["object"]["sha"]
        parent_commits.append(parent_sha)
        status_c, commit_data = github_request(f"https://api.github.com/repos/{owner}/{repo_name}/git/commits/{parent_sha}", token)
        if status_c == 200:
            base_tree_sha = commit_data.get("tree", {}).get("sha")

    # 4. Create Tree
    print("4. Creating Git Tree on GitHub...", flush=True)
    tree_payload = {"tree": tree_items}
    if base_tree_sha:
        tree_payload["base_tree"] = base_tree_sha

    status, tree_info = github_request(
        f"https://api.github.com/repos/{owner}/{repo_name}/git/trees",
        token,
        method="POST",
        data=tree_payload
    )
    if status not in [200, 201]:
        print(f"Error creating tree: {tree_info}", flush=True)
        return False
    tree_sha = tree_info["sha"]

    # 5. Create Commit
    print("5. Creating Commit...", flush=True)
    status, commit_info = github_request(
        f"https://api.github.com/repos/{owner}/{repo_name}/git/commits",
        token,
        method="POST",
        data={
            "message": "Add complete Renova platform with SQLite backend and GitHub Pages hosting",
            "tree": tree_sha,
            "parents": parent_commits
        }
    )
    if status not in [200, 201]:
        print(f"Error creating commit: {commit_info}", flush=True)
        return False
    commit_sha = commit_info["sha"]

    # 6. Update Ref
    print(f"6. Updating branch '{default_branch}' to {commit_sha[:7]}...", flush=True)
    if parent_commits:
        status, update_ref_info = github_request(
            ref_url,
            token,
            method="PATCH",
            data={"sha": commit_sha, "force": True}
        )
    else:
        status, update_ref_info = github_request(
            f"https://api.github.com/repos/{owner}/{repo_name}/git/refs",
            token,
            method="POST",
            data={"ref": f"refs/heads/{default_branch}", "sha": commit_sha}
        )

    if status not in [200, 201]:
        print(f"Error updating branch ref: {update_ref_info}", flush=True)
        return False

    print(f"   Code successfully pushed to branch '{default_branch}'!", flush=True)

    # 7. Enable GitHub Pages if not already active
    print("7. Checking GitHub Pages configuration...", flush=True)
    pages_url = f"https://api.github.com/repos/{owner}/{repo_name}/pages"
    pages_payload = {
        "source": {
            "branch": default_branch,
            "path": "/"
        }
    }
    status, pages_info = github_request(pages_url, token, method="POST", data=pages_payload)
    if status in [200, 201]:
        print("   GitHub Pages enabled successfully!", flush=True)
    elif status == 409:
        print("   GitHub Pages is already active for this repository.", flush=True)
    else:
        status_g, pg_info = github_request(pages_url, token)
        if status_g == 200:
            print("   GitHub Pages is active.", flush=True)
        else:
            print(f"   Pages note: {pages_info.get('message', '')}", flush=True)

    gh_pages_link = f"https://{owner}.github.io/{repo_name}/"
    gh_repo_link = f"https://github.com/{owner}/{repo_name}"

    print("\n" + "="*60, flush=True)
    print("SUCCESS: DEPLOYMENT COMPLETED SUCCESSFULLY!", flush=True)
    print(f"GitHub Repository: {gh_repo_link}", flush=True)
    print(f"GitHub Pages URL:   {gh_pages_link}", flush=True)
    print("="*60 + "\n", flush=True)
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python github_deploy.py <GITHUB_TOKEN> <REPO_NAME> [is_private: true/false]")
        sys.exit(1)
    tok = sys.argv[1]
    rname = sys.argv[2]
    priv = len(sys.argv) > 3 and sys.argv[3].lower() == "true"
    deploy_to_github(tok, rname, is_private=priv)
