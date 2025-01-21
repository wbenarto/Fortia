import { neon } from '@neondatabase/serverless';


export async function POST(request: Request) {
    
    try {
        const sql = neon(`${process.env.DATABASE_URL}`);

        const { clerkId, weight, date } = await request.json();
        if (!weight || !date || !clerkId ) {
            return Response.json({error: "Missing required fields"} , {status: 400})
        } 

        const response = await sql`
        INSERT INTO weights (
            weight,
            date,
            clerk_id
        )
        VALUES (
            ${weight},
            ${date},
            ${clerkId}
        )
        `;
        return new Response(JSON.stringify({data: response}), {status: 201})

    } catch (err) {
        console.log(err)
        return Response.json({error: err}, {status: 400})
    }
}

export async function GET(request: Request) {
    const sql = neon(`${process.env.DATABASE_URL}`);
    console.log('GET request' , request)

    try {
        const weights = []

        const response = await sql`
        SELECT * FROM weights 
        `
        console.log('YESS ', response)
        return Response.json({data: response})
    

    } catch (err) {
        console.log(err)
        return Response.json({error: err}, {status: 400})
    }
}

// See https://neon.tech/docs/serverless/serverless-driver
// for more information