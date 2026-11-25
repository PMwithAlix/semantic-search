import pandas as pd
from pathlib import Path

df = pd.read_csv(
    Path(__file__).resolve().parents[1] / "hamrah_imie_cdr_with_story.csv",
    encoding="utf-8-sig",
)

print("SMS sample OtherParty:", df[df["EstablishmentCause"] == "Short Message Services"]["OtherPartyNumber"].value_counts().head(5).to_string())
print("\nPaging sample:", df[df["EstablishmentCause"] == "In Response to Paging"].head(3)[["source_imei", "OtherPartyNumber", "Duration"]].to_string())
print("\nQatar/UAE:", df[df["OtherPartyCountry"].isin(["Qatar", "United Arab Emirates"])][["source_imei", "OtherPartyNumber", "OtherPartyCountry"]].head(5).to_string())
print("\nThuraya IMEI top:", df[df["OtherPartyCountry"] == "Thuraya"]["source_imei"].value_counts().head(3).to_string())
print("\n9647800526370 IMEIs:", df[df["OtherPartyNumber"] == "9647800526370"]["source_imei"].value_counts().to_string())
print("\nSpot118 Thuraya:", len(df[(df["Spot"].astype(str) == "118") & (df["OtherPartyCountry"] == "Thuraya")]))
print("Spot130 Thuraya:", len(df[(df["Spot"].astype(str) == "130") & (df["OtherPartyCountry"] == "Thuraya")]))
