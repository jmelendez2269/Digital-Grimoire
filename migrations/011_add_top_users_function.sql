-- Function to get top users by activity
CREATE OR REPLACE FUNCTION get_top_users_by_activity(days INT DEFAULT 30)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    name TEXT,
    total_uploads INT,
    total_views INT,
    total_searches INT,
    total_annotations INT,
    total_activity INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        u.name,
        COALESCE(SUM(uas.documents_uploaded), 0)::INT as total_uploads,
        COALESCE(SUM(uas.documents_viewed), 0)::INT as total_views,
        COALESCE(SUM(uas.searches_performed), 0)::INT as total_searches,
        COALESCE(SUM(uas.annotations_created), 0)::INT as total_annotations,
        COALESCE(
            SUM(uas.documents_uploaded) + 
            SUM(uas.documents_viewed) + 
            SUM(uas.searches_performed) + 
            SUM(uas.annotations_created) +
            SUM(uas.bookmarks_created)
        , 0)::INT as total_activity
    FROM users u
    LEFT JOIN user_activity_summary uas ON u.id = uas.user_id
        AND uas.date >= CURRENT_DATE - days
    GROUP BY u.id, u.email, u.name
    HAVING COALESCE(
        SUM(uas.documents_uploaded) + 
        SUM(uas.documents_viewed) + 
        SUM(uas.searches_performed) + 
        SUM(uas.annotations_created) +
        SUM(uas.bookmarks_created)
    , 0) > 0
    ORDER BY total_activity DESC;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Top users function created successfully! ✅' as message;

