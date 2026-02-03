CREATE UNIQUE INDEX "issues_project_issue_number_key"
ON "issues" USING btree ("project_id", "issue_number");
