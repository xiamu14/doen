WITH ordered_projects AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at, id) - 1 AS color_index
  FROM project
)
UPDATE project
SET color = (ARRAY['#69D571', '#D569B2', '#697ED5', '#D5C169'])[((ordered_projects.color_index % 4) + 1)::int]
FROM ordered_projects
WHERE project.id = ordered_projects.id;
