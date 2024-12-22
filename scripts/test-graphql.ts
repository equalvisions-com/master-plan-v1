async function testGraphQLEndpoint() {
  try {
    const authString = Buffer.from(
      `${process.env.WP_APPLICATION_USERNAME}:${process.env.WP_APPLICATION_PASSWORD}`
    ).toString('base64');

    const response = await fetch(process.env.NEXT_PUBLIC_WORDPRESS_API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify({
        query: `
          {
            generalSettings {
              title
              description
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status}\n${text}`);
    }

    const data = await response.json();
    console.log('GraphQL Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('GraphQL Test Failed:', error);
  }
}

testGraphQLEndpoint(); 