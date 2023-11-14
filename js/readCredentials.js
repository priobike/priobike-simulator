async function readCreadentials()
{
    const response = await fetch('../data/credentials.json');
    if (!response.ok)
    {
        throw new Error('Fehler beim einlesen der Credentials');
    }
    return await response.json();
}