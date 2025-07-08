const getFamilySql = `
WITH family_users AS (
    SELECT
        id,
        first_name,
        middle_name,
        last_name,
        email,
        gender,
        birthday,
        family_id
    FROM users
    WHERE family_id = $1
)
SELECT 
    f.*,
    (SELECT json_agg(fu) FROM family_users fu) AS users
FROM 
    family f
WHERE 
    f.id = $1;`;

export default getFamilySql;
