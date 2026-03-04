import { redirect } from 'next/navigation';

// Deck Forge has moved to the Workbench
export default function TarotForgeRedirectPage() {
    redirect('/workbench/tarot');
}

