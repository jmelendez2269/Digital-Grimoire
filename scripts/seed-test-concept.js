
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedConcept() {
    console.log('Seeding test concept...');

    const testConcept = {
        name: "Test Concept Alpha",
        slug: "test-concept-alpha",
        tradition: "Digital Mysticism",
        short_definition: "A test concept to verify the convergence graph.",
        tags: ["test", "debug"]
    };

    const { data, error } = await supabase
        .from('convergence_concepts')
        .upsert(testConcept, { onConflict: 'slug' })
        .select()
        .single();

    if (error) {
        console.error('Error seeding concept:', error);
        process.exit(1);
    }

    console.log('Successfully seeded concept:', data);
}

seedConcept();
