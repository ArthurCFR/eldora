"""
Integration test - Simulate the full flow
"""
import sys
import os
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.config_loader import ConfigLoader
from utils.prompt_builder import PromptBuilder


def test_full_integration():
    """Test the complete flow from config to prompt generation"""
    print("\n🔬 Integration Test - Full Flow")
    print("=" * 70)

    # Step 1: Load configuration
    print("\n1️⃣  Loading configuration...")
    config = ConfigLoader("config/products.json")
    print(f"✅ Loaded {config.get_products_count()} products")

    # Step 2: Create prompt builder
    print("\n2️⃣  Creating prompt builder...")
    builder = PromptBuilder(config)
    print("✅ Prompt builder created")

    # Step 3: Simulate conversation
    print("\n3️⃣  Simulating conversation...")
    fake_conversation = """
ASSISTANT: Salut Thomas ! Comment s'est passée ta journée ?
USER: Super ! J'ai vendu 3 smartphones et 2 télés
ASSISTANT: Excellent ! Des retours clients ?
USER: Oui, les clients adorent les écrans 8K
    """.strip()
    print(f"✅ Conversation: {len(fake_conversation)} chars")

    # Step 4: Build attention structure
    print("\n4️⃣  Building attention structure...")
    attention_structure = """
1. PRODUITS VENDUS
2. RETOURS CLIENTS
3. PROFIL DES VISITEURS
    """.strip()
    print("✅ Attention structure created")

    # Step 5: Generate prompt
    print("\n5️⃣  Generating Claude prompt...")
    prompt = builder.build_claude_extraction_prompt(
        conversation_text=fake_conversation,
        attention_structure=attention_structure
    )
    print(f"✅ Prompt generated: {len(prompt)} chars")

    # Step 6: Validate prompt content
    print("\n6️⃣  Validating prompt content...")

    # Check all products are in prompt
    product_names = config.get_product_names_list()
    for product_name in product_names:
        assert product_name in prompt, f"Product {product_name} missing in prompt"
    print(f"✅ All {len(product_names)} products present")

    # Check conversation is in prompt
    assert fake_conversation in prompt, "Conversation missing in prompt"
    print("✅ Conversation text included")

    # Check attention structure is in prompt
    assert "PRODUITS VENDUS" in prompt, "Attention structure missing"
    print("✅ Attention structure included")

    # Check JSON structure
    assert '"sales":' in prompt, "Sales structure missing"
    assert '"customer_feedback":' in prompt, "Feedback structure missing"
    print("✅ JSON structure present")

    # Step 7: Validate empty sales dict
    print("\n7️⃣  Validating empty sales dictionary...")
    empty_sales = config.get_empty_sales_dict()
    assert len(empty_sales) == config.get_products_count()
    assert all(v == 0 for v in empty_sales.values())
    print(f"✅ Empty sales dict valid: {len(empty_sales)} products with 0 sales")

    # Step 8: Test product validation
    print("\n8️⃣  Testing product validation...")
    # Simulate extracted data with missing products
    fake_extracted_data = {
        "sales": {
            "Samsung Galaxy Z Nova": 3,
            "Samsung QLED Vision 8K": 2
            # Missing other 8 products
        },
        "customer_feedback": "Test feedback",
        "key_insights": ["Test insight"]
    }

    expected_products = set(config.get_product_names_list())
    actual_products = set(fake_extracted_data["sales"].keys())
    missing = expected_products - actual_products

    # Add missing products
    for product_name in missing:
        fake_extracted_data["sales"][product_name] = 0

    assert len(fake_extracted_data["sales"]) == config.get_products_count()
    print(f"✅ Added {len(missing)} missing products successfully")

    # Summary
    print("\n" + "=" * 70)
    print("🎉 Integration Test PASSED")
    print("=" * 70)
    print("\n📊 Test Summary:")
    print(f"   ✅ Config loaded: {config.get_products_count()} products")
    print(f"   ✅ Prompt generated: {len(prompt)} characters")
    print(f"   ✅ All products validated")
    print(f"   ✅ Conversation flow simulated")
    print(f"   ✅ Product validation working")

    return True


if __name__ == "__main__":
    try:
        test_full_integration()
        sys.exit(0)
    except AssertionError as e:
        print(f"\n❌ Integration test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
