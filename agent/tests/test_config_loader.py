"""
Test suite for ConfigLoader and PromptBuilder
"""
import sys
import os

# Add parent directory to path to import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.config_loader import ConfigLoader
from utils.prompt_builder import PromptBuilder


def test_config_loader():
    """Test ConfigLoader functionality"""
    print("\n🧪 Testing ConfigLoader...")

    # Load config
    config = ConfigLoader("config/products.json")

    # Test 1: Loading products
    assert config.get_products_count() > 0, "Should load products"
    print(f"✅ Test 1 passed: Loaded {config.get_products_count()} products")

    # Test 2: Products list generation
    products_list = config.get_products_list_for_prompt()
    assert len(products_list) > 100, "Products list should be detailed"
    print(f"✅ Test 2 passed: Generated products list ({len(products_list)} chars)")

    # Test 3: Empty sales dict
    sales = config.get_empty_sales_dict()
    assert len(sales) == config.get_products_count(), "Sales dict should match product count"
    print(f"✅ Test 3 passed: Generated empty sales dict with {len(sales)} products")
    print(f"   First 3 products: {list(sales.keys())[:3]}")

    # Test 4: Product names list
    product_names = config.get_product_names_list()
    assert len(product_names) == config.get_products_count(), "Product names list should match count"
    print(f"✅ Test 4 passed: Generated product names list")

    # Test 5: Mapping examples
    mapping_examples = config.get_mapping_examples()
    assert "EXEMPLES DE MAPPING CORRECTS" in mapping_examples, "Should contain mapping examples header"
    print(f"✅ Test 5 passed: Generated mapping examples ({len(mapping_examples)} chars)")

    return config


def test_prompt_builder(config):
    """Test PromptBuilder functionality"""
    print("\n🧪 Testing PromptBuilder...")

    # Create builder
    builder = PromptBuilder(config)

    # Test 1: Build full prompt
    prompt = builder.build_claude_extraction_prompt(
        conversation_text="Test conversation",
        attention_structure="1. TEST SECTION"
    )

    # Validate prompt content
    assert "LISTE EXHAUSTIVE DES PRODUITS" in prompt, "Prompt should contain product list header"
    assert str(config.get_products_count()) in prompt, "Prompt should contain product count"
    assert "Test conversation" in prompt, "Prompt should contain conversation text"
    assert "TEST SECTION" in prompt, "Prompt should contain attention structure"

    print(f"✅ Test 1 passed: Generated full prompt ({len(prompt)} chars)")

    # Test 2: Check all products are in prompt
    product_names = config.get_product_names_list()
    for product_name in product_names:
        assert product_name in prompt, f"Product {product_name} should be in prompt"

    print(f"✅ Test 2 passed: All {len(product_names)} products present in prompt")

    # Test 3: Validate JSON structure example
    assert '"sales":' in prompt, "Prompt should contain sales structure"
    assert '"customer_feedback":' in prompt, "Prompt should contain feedback structure"
    assert '"key_insights":' in prompt, "Prompt should contain insights structure"

    print("✅ Test 3 passed: JSON structure properly formatted")

    return prompt


def test_products_json_structure():
    """Test that products.json has the correct structure"""
    print("\n🧪 Testing products.json structure...")

    import json

    with open("config/products.json", 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Test 1: Has products key
    assert "products" in data, "JSON should have 'products' key"
    products = data["products"]
    print(f"✅ Test 1 passed: JSON has 'products' key with {len(products)} items")

    # Test 2: Each product has required fields
    required_fields = ["name", "display_name", "category", "keywords", "target_quantity"]
    for i, product in enumerate(products):
        for field in required_fields:
            assert field in product, f"Product {i} should have '{field}' field"

    print(f"✅ Test 2 passed: All products have required fields")

    # Test 3: Keywords are non-empty
    for i, product in enumerate(products):
        assert len(product["keywords"]) > 0, f"Product {i} should have at least one keyword"

    print("✅ Test 3 passed: All products have keywords")

    return data


def run_all_tests():
    """Run all tests"""
    print("=" * 70)
    print("🚀 Running Voyaltis Agent Config Tests")
    print("=" * 70)

    try:
        # Test products.json structure
        test_products_json_structure()

        # Test ConfigLoader
        config = test_config_loader()

        # Test PromptBuilder
        prompt = test_prompt_builder(config)

        print("\n" + "=" * 70)
        print("🎉 All tests passed!")
        print("=" * 70)

        print("\n📊 Summary:")
        print(f"   - Products loaded: {config.get_products_count()}")
        print(f"   - Prompt length: {len(prompt)} characters")
        print(f"   - Product names: {', '.join(config.get_product_names_list()[:3])}...")

        return True

    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
