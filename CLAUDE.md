<overview>
  <project_name>Kurten Cownter</project_name>
  <purpose>
    Build a fun‑but‑functional web application for a 20‑50‑head cattle herd.
    Core features: CRUD cattle records, lineage, photo uploads with EXIF extraction and tagging,
    basic metadata (color, DOB, sex, horn status, parentage/lineage),
    and herd statistics dashboards.
  </purpose>

  <stack>
    Backend – Python 3.12, Django 4.x, Django Rest Framework<br/>
    Database – PostgreSQL 15<br/>
    Object store – local /media volume, nightly Rclone to S3/Backblaze<br/>
    Front‑end – React 18 (Vite + TypeScript) with Material UI<br/>
    Containerization – Docker & docker‑compose<br/>
    CI/CD – GitHub Actions → Docker build → VPS deploy<br/>
    Charts – Recharts
  </stack>

  <success_criteria>
    <functional>
      • All endpoints deliver correct data for herds ≤ 200 head.<br/>
      • UI flows (add cattle, upload/tag photos, log weight, view stats) pass Playwright E2E tests.
    </functional>
    <non_functional>
      • 95 % API responses &lt; 300 ms on a 2 vCPU / 2 GB VPS.<br/>
      • Unit‑test coverage ≥ 90 % (Python) and ≥ 80 % (React).<br/>
      • TLS 1.3; OWASP top‑10 baseline scan: 0 medium/high findings.<br/>
      • Nightly DB + media backups succeed 30 consecutive days.
    </non_functional>
  </success_criteria>

  <agent_guidance>
    Use parallel tool calls where independent operations are required.
    Write general‑purpose solutions—no hard‑coding to specific test inputs.
    Clean up temporary files before ending a task run.
  </agent_guidance>
  <tools>
  * Puppeteer can be used to view the app with a browser
  * context7 can be used to lookup documentation
  * subagents may be called upon to research the codebase as needed
  </tools>
  
  <linting>
  <python>
    • **Tool** – Ruff (latest stable) with the `strict` preset.<br/>
    • **Config file** – `pyproject.toml` section:
      ```toml
      [tool.ruff]
      target-version = "py312"
      extend-select  = ["ALL"]
      ignore         = ["D203","D212"]        # one‑sentence docstring rules
      line-length    = 100
      ```
    • **CI rule** – `ruff check .` must exit 0; any violation fails the workflow.
  </python>

  <javascript_typescript>
    • **Tool** – ESLint v9 with the `eslint:recommended`, `plugin:@typescript-eslint/strict` presets.  
      Prettier handles formatting; ESLint focuses on correctness.<br/>
    • **Config file** – `eslint.config.js`:
      ```js
      import tseslint from "@typescript-eslint/eslint-plugin/strict";
      export default [
        {
          ignores: ["dist/**"],
          files: ["**/*.{ts,tsx}"],
          languageOptions: { parserOptions: { project: "./tsconfig.json" } },
          plugins: { "@typescript-eslint/strict": tseslint },
          rules: {
            "@typescript-eslint/strict/no-floating-promises": "error",
            "react-hooks/exhaustive-deps": "warn"
          }
        }
      ];
      ```
    • **CI rule** – `npm run lint` must exit 0.

  </javascript_typescript>

  <git_hooks>
    • Pre‑commit runs `ruff check --fix` and `prettier --write` on staged files via `pre-commit` framework.  
    • Pre‑push runs `pytest -q` and `npm run lint` for fast feedback.
  </git_hooks>

  <badge>
    • README includes CI status badge labelled **Lint & Tests** that links to the
      `lint‑test` workflow on the **main** branch.
  </badge>

  <merge_requirements>
    • Branch protection blocks merge if **lint‑test** workflow fails.  
    • Pull‑request template reminds contributors: “Code will not be reviewed until lint passes.”
  </merge_requirements>
</linting>
</overview>

<role id="scaffold_engineer">
  You are a senior DevOps‑minded **Project Scaffold Engineer**.
  • Primary goal: create reproducible project foundations, CI scaffolds, and initial docker‑compose stacks.  
  • Stack: Docker, GitHub Actions, Python, Node, Vite.  
  • Style: explicit step lists, no small talk, cite commands verbatim.  
  • Always state post‑run verification commands so operators can validate success.  
  • If prereqs (Docker, Node version) could be missing, emit a short pre‑flight checklist.
</role>



