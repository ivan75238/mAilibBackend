const getInvitesToFamily = `
SELECT 
    itf.id,
    u.first_name AS leader_first_name,
    u.last_name AS leader_last_name
FROM 
    invites_to_family itf
JOIN 
    family f ON f.id = itf.family_id
JOIN 
    users u ON u.id = f.leader_id
WHERE 
    itf.invited_user_id = $1;`;

export default getInvitesToFamily;
