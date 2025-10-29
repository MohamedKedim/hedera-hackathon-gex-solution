# Git Repository Cleanup Guide

## Problem Summary

Your repository was **138 MB** because it contains large files in git history:

| File/Directory | Size | Issue |
|---------------|------|-------|
| Terraform AWS Provider Binary | **679.9 MB** | Accidentally committed provider binary |
| Terraform State Files | ~180 KB | State files should never be in git |
| .DS_Store files | Small | macOS system files |
| tree file | 8 MB | Untracked debug file |

**Total git pack size: 135.99 MB**

## Root Cause

The root `.gitignore` was incomplete and missing critical patterns. The Terraform provider binary in `OcrPlausibilityCheck/terraform/.terraform/` was committed before the `.gitignore` was properly configured.

## Solution

### ✅ Step 1: Updated .gitignore (COMPLETED)

I've updated your [.gitignore](.gitignore) with comprehensive patterns including:
- Terraform directories and state files (`**/.terraform/*`, `*.tfstate`)
- OS files (`.DS_Store`, `Thumbs.db`)
- Node modules and Python caches
- Build artifacts and temporary files
- Secrets and credentials

### 🔧 Step 2: Clean Git History (ACTION REQUIRED)

You need to remove the large files from git history:

#### Option A: Using git-filter-repo (Recommended)

1. Install git-filter-repo:
   ```bash
   brew install git-filter-repo
   # OR
   pip3 install git-filter-repo
   ```

2. Run the cleanup script:
   ```bash
   ./cleanup-git-history.sh
   ```

3. Force push to GitHub:
   ```bash
   git push origin main --force
   ```

#### Option B: Manual BFG Cleaner

```bash
# Install BFG
brew install bfg

# Remove files larger than 1MB
bfg --strip-blobs-bigger-than 1M .

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin main --force
```

#### Option C: Start Fresh (Simplest)

If this is a new repository with no important history:

```bash
# Remove git history
rm -rf .git

# Initialize new repo
git init
git add .
git commit -m "Initial commit with cleaned repository"

# Force push to GitHub
git remote add origin <your-github-url>
git push -u origin main --force
```

### 📊 Expected Results

After cleanup:
- **Before**: 135.99 MB pack size
- **After**: ~2-3 MB (just your actual code)
- **Push time**: Should complete in seconds instead of timing out

### ⚠️ Important Notes

1. **Backup First**: The cleanup scripts create a `backup-before-cleanup` branch
2. **Coordinate with Team**: If others have cloned this repo, they'll need to re-clone after you force push
3. **One-time Operation**: After cleanup, the new `.gitignore` will prevent this from happening again

### 🔍 Verify Cleanup

After running cleanup, verify the size reduction:

```bash
# Check repository size
du -sh .git

# Check git object stats
git count-objects -vH

# Verify no large files remain
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print $3, $4}' | \
  sort -n -r | \
  head -10
```

### 🚀 Future Prevention

The updated `.gitignore` now catches:
- ✅ All Terraform provider binaries and plugins
- ✅ Terraform state files
- ✅ Node modules
- ✅ Python virtual environments
- ✅ Build artifacts
- ✅ OS-specific files
- ✅ IDE configuration
- ✅ Secrets and credentials

## Questions?

If you encounter issues:
1. Check that git-filter-repo is installed correctly
2. Verify you're on the correct branch
3. Ensure you have no uncommitted changes
4. Review the backup branch if needed: `git checkout backup-before-cleanup`
