import { neon } from '@neondatabase/serverless';


export async function POST(request: Request) {
    
    try {
        const sql = neon(`${process.env.DATABASE_URL}`);

        const { name, email, clerkId } = await request.json();
        if (!name || !email || !clerkId ) {
            return Response.json({error: "Missing required fields"} , {status: 400})
        } 

        const response = await sql`
        INSERT INTO users (
            name,
            email,
            clerk_id
        )
        VALUES (
            ${name},
            ${email},
            ${clerkId}
        )
        `;
        return new Response(JSON.stringify({data: response}), {status: 201})

    } catch (err) {
        console.log(err)
        return Response.json({error: err}, {status: 400})
    }
}

// See https://neon.tech/docs/serverless/serverless-driver
// for more information