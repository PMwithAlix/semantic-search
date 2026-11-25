from app.services.query_intent import infer_query_intent, merge_metadata_filters


def test_iran_origin_query():
    intent = infer_query_intent("تماس هایی که از مبدا ایران هست")
    assert intent.filters == {"Country": "Iran"}
    assert intent.strict is True


def test_uae_destination_query():
    intent = infer_query_intent("تماس‌هایی که مقصد آن‌ها امارات متحده عربی (UAE) است")
    assert intent.filters == {"OtherPartyCountry": "United Arab Emirates"}


def test_iraq_origin_query():
    intent = infer_query_intent("تماس از مبدا عراق")
    assert intent.filters == {"Country": "Iraq"}


def test_manual_filter_overrides_inferred():
    merged, intent = merge_metadata_filters(
        "تماس از مبدا ایران",
        {"Country": "Iraq"},
    )
    assert merged == {"Country": "Iraq"}
    assert intent.filters == {"Country": "Iran"}


def test_no_intent_for_generic_query():
    intent = infer_query_intent("گزارش‌های مشکوک")
    assert intent.filters == {}
    assert intent.strict is False
