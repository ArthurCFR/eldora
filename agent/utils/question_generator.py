"""
Question Generator
Transforms attention point descriptions into natural, oral questions
"""
import re
from typing import List


def generate_natural_question(description: str, index: int = 1, time_period: str = "aujourd'hui") -> str:
    """
    Generate a natural, oral question from an attention point description

    Args:
        description: The attention point description (e.g., "Produits vendus avec quantités")
        index: The question number (for variation)
        time_period: Time period context (e.g., "aujourd'hui", "cette semaine", "ce mois-ci")

    Returns:
        A natural, conversational question suitable for voice interaction
    """

    # Normalize description
    desc_lower = description.lower().strip()

    # Pattern matching for common types of attention points
    patterns = [
        # Sales/Products
        (r'produits?\s+(vendus?|commercialis[ée]s?)', [f"Qu'est-ce que tu as vendu {time_period} ?", "Tu as vendu quels produits ?", "Ça a donné quoi niveau ventes ?"]),
        (r'ventes?|commercialis', ["Tu as fait combien de ventes ?", f"Ça a bien marché {time_period} ?", "T'as vendu quoi ?"]),
        (r'quantit[ée]s?', ["Tu as vendu combien d'unités ?", "T'as fait du volume ?"]),

        # Opportunities
        (r'opportunit[ée]s?', ["Tu as eu des belles opportunités ?", "T'as détecté des gros coups ?", "Des pistes intéressantes ?"]),
        (r'(b2b|b2c|prospects?)', ["T'as rencontré des prospects intéressants ?", "Des nouvelles pistes à suivre ?"]),
        (r'(projet|affaire|deal)', ["T'as des projets qui avancent ?", "Des affaires en cours ?"]),

        # Customer feedback
        (r'retours?\s+clients?', ["Les clients ont dit quoi ?", "T'as eu des retours intéressants ?", "Qu'est-ce que les clients ont pensé ?"]),
        (r'(avis|feedback|commentaires?)', ["Ils ont donné leur avis sur les produits ?", "Des remarques particulières ?"]),
        (r'satisfaction', ["Les clients étaient contents ?", "Ça leur a plu ?"]),

        # Competition
        (r'concurren(ce|t)', ["T'as croisé la concurrence ?", "Des concurrents sur le terrain ?", "Qui est en place chez tes clients ?"]),
        (r'(march[ée]|positionnement)', ["C'est quoi le mood du marché en ce moment ?", "Comment tu sens le marché ?"]),

        # Technical issues
        (r'(probl[èe]mes?|difficult[ée]s?|incidents?)', ["Tout s'est bien passé ?", "T'as eu des galères ?", "Des problèmes à remonter ?"]),
        (r'techniques?', ["Ça a marché niveau matos ?", "Pas de souci technique ?"]),

        # Client profile
        (r'profils?\s+(de\s+)?clients?', ["T'as rencontré quel type de clients ?", "C'était qui tes rendez-vous ?", f"Quel genre de clients {time_period} ?"]),
        (r'types?\s+(de\s+)?clients?', ["T'as vu quel genre de clients ?", f"C'était quoi le profil {time_period} ?"]),
        (r'(visites?|rendez[- ]vous)', ["Tu as fait combien de rendez-vous ?", f"T'as vu qui {time_period} ?"]),

        # Pricing/Budget
        (r'(prix|tarifs?|budget)', ["On t'a parlé budget ?", "Des questions sur les prix ?", "Ils ont négocié ?"]),
        (r'(remises?|n[ée]gociations?)', ["T'as dû négocier ?", "Des demandes de remise ?"]),

        # Events
        (r'[ée]v[èe]nements?', ["T'as fait un événement ?", "Comment s'est passé l'événement ?"]),
        (r'animations?', ["T'as animé quelque chose ?", "Des animations prévues ?"]),

        # Stock/Logistics
        (r'stocks?', ["T'as besoin de réassort ?", "Des produits à recommander ?"]),
        (r'livraisons?', ["Des livraisons à prévoir ?", "Tout est OK niveau logistique ?"]),

        # Follow-up
        (r'(suivi|relance)', ["Qui faut-il recontacter ?", "Des relances à faire ?", "T'as des clients à rappeler ?"]),
        (r'(prochaines?\s+[ée]tapes?|next)', ["C'est quoi la suite ?", "Les prochaines étapes ?"]),
    ]

    # Try to match patterns
    for pattern, questions in patterns:
        if re.search(pattern, desc_lower):
            # Return the first question variant (could be randomized)
            return questions[0] if index == 1 else questions[min(index-1, len(questions)-1)]

    # Fallback: Try to make it more natural
    # Remove parentheses content (often technical details)
    clean_desc = re.sub(r'\([^)]*\)', '', description).strip()

    # Convert to question based on keywords
    if any(word in desc_lower for word in ['détail', 'informations', 'données']):
        return f"Tu peux me parler de {clean_desc.lower()} ?"
    elif any(word in desc_lower for word in ['nombre', 'combien', 'quantité']):
        return f"T'as eu combien de {clean_desc.lower()} ?"
    elif any(word in desc_lower for word in ['qui', 'quel']):
        return f"C'était {clean_desc.lower()} ?"
    else:
        # Generic but more natural than "Parle-moi de..."
        return f"Ça s'est passé comment pour {clean_desc.lower()} ?"


def generate_period_intro(frequency: str, report_goal: str = None) -> str:
    """
    Generate a contextual intro based on report frequency and goal

    Args:
        frequency: Report frequency (daily, weekly, biweekly, monthly, per-appointment)
        report_goal: Optional goal/objective of the report

    Returns:
        A natural introduction that sets the context for the report period
    """

    # Vary the intros for natural conversation
    intros = {
        'daily': [
            "c'est parti pour ton point du jour !",
            "prêt pour ton rapport quotidien ?",
            "on fait le point sur ta journée ?",
            "faisons le debriefing de ta journée !",
        ],
        'weekly': [
            "c'est parti, faisons un point sur la semaine !",
            "prêt pour le bilan de la semaine ?",
            "on fait le point sur cette semaine ?",
            "alors cette semaine, ça a donné quoi ?",
        ],
        'biweekly': [
            "c'est parti, faisons le bilan des deux dernières semaines !",
            "prêt pour le point sur ces deux semaines ?",
            "on fait le point sur cette quinzaine ?",
        ],
        'monthly': [
            "c'est parti pour le bilan du mois !",
            "prêt pour le point mensuel ?",
            "on fait le bilan de ce mois ?",
        ],
        'per-appointment': [
            "c'est parti pour le debriefing de ta visite !",
            "prêt pour ton compte-rendu ?",
            "on fait le point sur ton rendez-vous ?",
        ],
    }

    # Get intro for the frequency (default to first option)
    frequency_intros = intros.get(frequency, intros['daily'])
    intro = frequency_intros[0]  # Could be randomized in the future

    # If we have a specific goal, we could adapt the intro
    # For now, just return the base intro
    return intro


def generate_opening_question(
    user_name: str,
    first_attention_point: dict,
    frequency: str = "daily",
    report_goal: str = None,
    time_period: str = "aujourd'hui"
) -> str:
    """
    Generate an engaging opening question that includes the first attention point

    Args:
        user_name: The user's name
        first_attention_point: The first attention point with description
        frequency: Report frequency (daily, weekly, biweekly, monthly, per-appointment)
        report_goal: Optional goal/objective of the report
        time_period: Time period context (e.g., "aujourd'hui", "cette semaine")

    Returns:
        A warm opening that naturally leads into the first question
    """
    desc = first_attention_point.get("description", "")

    # Check if natural prompts are provided
    natural_prompts = first_attention_point.get("naturalPrompts", [])
    if natural_prompts:
        first_question = natural_prompts[0]
    else:
        # Generate natural question with time period
        first_question = generate_natural_question(desc, index=1, time_period=time_period)

    # Generate contextual intro
    period_intro = generate_period_intro(frequency, report_goal)

    # Combine: greeting + period intro + first question
    return f"Salut {user_name} ! {period_intro} Alors, {first_question}"


# Examples for testing
if __name__ == "__main__":
    test_cases = [
        "Produits vendus avec quantités et prix",
        "Retours clients et satisfaction",
        "Opportunités B2B/B2C (taille du projet, budget, délai de décision)",
        "Détail des opportunités B2B/B2C (taille du projet, budget, délai de décision)",
        "Problèmes techniques rencontrés",
        "Profil des clients rencontrés",
        "Concurrence sur le terrain",
        "Événements ou animations réalisés",
        "Besoins de réassort ou support technique"
    ]

    print("🧪 Test du générateur de questions naturelles\n")
    print("=" * 70)

    for desc in test_cases:
        question = generate_natural_question(desc)
        print(f"\n📋 Point d'attention : \"{desc}\"")
        print(f"❓ Question générée : \"{question}\"")

    print("\n" + "=" * 70)
    print("\n✅ Tests terminés !")
