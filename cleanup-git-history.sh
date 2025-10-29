#!/bin/bash

# =========================================================================
# Git Repository Cleanup Script
# =========================================================================
# This script removes large files from git history to reduce repository size
#
# IMPORTANT: This rewrites git history! Run this BEFORE pushing to GitHub
# or after coordinating with your team.
# =========================================================================

set -e

echo "=========================================="
echo "Git Repository Cleanup Script"
echo "=========================================="
echo ""

# Check if git-filter-repo is installed
if ! command -v git-filter-repo &> /dev/null; then
    echo "ERROR: git-filter-repo is not installed."
    echo ""
    echo "Install it with:"
    echo "  brew install git-filter-repo"
    echo ""
    echo "Or with pip:"
    echo "  pip3 install git-filter-repo"
    echo ""
    exit 1
fi

echo "WARNING: This will rewrite git history!"
echo "Make sure you have a backup or can re-clone if needed."
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Step 1: Creating backup branch..."
git branch backup-before-cleanup 2>/dev/null || echo "Backup branch already exists"

echo ""
echo "Step 2: Removing large files from git history..."
echo "This may take a few minutes..."

# Remove the massive Terraform provider binary
git-filter-repo --path 'OcrPlausibilityCheck/terraform/.terraform/' --invert-paths --force

# Remove Terraform state files
git-filter-repo --path-glob '**/*.tfstate' --invert-paths --force
git-filter-repo --path-glob '**/*.tfstate.*' --invert-paths --force
git-filter-repo --path-glob '**/*.tfstate.backup' --invert-paths --force

# Remove any other .terraform directories that might exist
git-filter-repo --path-glob '**/.terraform/*' --invert-paths --force

# Remove .DS_Store files
git-filter-repo --path-glob '**/.DS_Store' --invert-paths --force

echo ""
echo "Step 3: Running garbage collection..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "=========================================="
echo "Cleanup Complete!"
echo "=========================================="
echo ""
git count-objects -vH
echo ""
echo "Next steps:"
echo "1. Verify your code still works"
echo "2. If pushing to existing remote, you'll need to force push:"
echo "   git push origin main --force"
echo ""
echo "3. All collaborators will need to re-clone or rebase their branches"
echo ""
echo "If something went wrong, restore from backup:"
echo "   git checkout backup-before-cleanup"
echo "=========================================="
