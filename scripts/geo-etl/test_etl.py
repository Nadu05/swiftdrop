import json
import tempfile
import unittest
from pathlib import Path

from etl import run_etl


class TestGeoEtlPipeline(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.raw_dir = self.root / "raw"
        self.out_dir = self.root / "curated"
        self.raw_dir.mkdir(parents=True, exist_ok=True)

        # Open Admin Data fixture
        (self.raw_dir / "provinces.csv").write_text(
            "code,name,latitude,longitude\n"
            "WP,  western  province ,6.9271,79.8612\n",
            encoding="utf-8",
        )
        (self.raw_dir / "districts.csv").write_text(
            "code,province_code,name,latitude,longitude\n"
            "COL,WP, colombo ,6.9271,79.8612\n",
            encoding="utf-8",
        )
        (self.raw_dir / "ds_divisions.csv").write_text(
            "code,district_code,name,latitude,longitude\n"
            "DS-COL-01,COL,Colombo,6.9344,79.8428\n"
            "DS-COL-02,COL,Thimbirigasyaya,6.8905,79.8636\n",
            encoding="utf-8",
        )
        (self.raw_dir / "gn_divisions.csv").write_text(
            "code,ds_division_code,name,postal_code,latitude,longitude\n"
            "GN-001,DS-COL-01,Fort,00100,6.9344,79.8428\n"
            "GN-002,DS-COL-02,Narahenpita,00500,6.8905,79.8780\n",
            encoding="utf-8",
        )

        # Sri Lanka Post authoritative reference fixture
        (self.raw_dir / "sl_post_reference.csv").write_text(
            "postal_code,area_name,district_name,province_name\n"
            "00100,Colombo 01 - Fort,Colombo,Western\n"
            "00500,Narahenpita,Colombo,Western\n"
            "00300,Kollupitiya,Colombo,Western\n",
            encoding="utf-8",
        )

        # Source postal codes fixture (slwdc/Postal-Codes style)
        # Includes: valid verified (00100, 00500), malformed (123), unverified (99999),
        # and conflicting (00300 mapped to wrong district Kandy)
        (self.raw_dir / "postal_codes.csv").write_text(
            "postal_code,area_name,province_code,district_code,ds_division_code,latitude,longitude,source_name,source_reference\n"
            "00100,  colombo 01 - fort ,WP,COL,DS-COL-01,6.9344,79.8428,slwdc/Postal-Codes,slwdc-2026\n"
            "00500,Narahenpita,WP,COL,DS-COL-02,6.8905,79.8780,slwdc/Postal-Codes,slwdc-2026\n"
            "123,Invalid Short,WP,COL,DS-COL-01,6.9000,79.8500,slwdc/Postal-Codes,slwdc-2026\n"
            "99999,Unverified Ghost Town,WP,COL,DS-COL-01,6.9000,79.8500,slwdc/Postal-Codes,slwdc-2026\n"
            "00300,Kollupitiya,WP,KAN,DS-COL-01,6.9110,79.8500,slwdc/Postal-Codes,slwdc-2026\n",
            encoding="utf-8",
        )

    def tearDown(self):
        self.tmp.cleanup()

    def test_etl_normalizes_validates_and_emits_bundle_and_report(self):
        bundle_path = self.out_dir / "sri-lanka-geo-bundle.json"
        report_path = self.out_dir / "validation-report.json"

        report = run_etl(
            raw_dir=self.raw_dir,
            bundle_output=bundle_path,
            report_output=report_path,
            import_version="2026.11.1",
        )

        self.assertTrue(bundle_path.exists())
        self.assertTrue(report_path.exists())

        bundle = json.loads(bundle_path.read_text(encoding="utf-8"))
        self.assertEqual(bundle["import_version"], "2026.11.1")
        self.assertEqual(bundle["provinces"][0]["name"], "Western")
        self.assertEqual(bundle["districts"][0]["name"], "Colombo")
        self.assertEqual(len(bundle["ds_divisions"]), 2)
        self.assertEqual(len(bundle["gn_divisions"]), 2)

        # Only verified, non-conflicting postal codes should be emitted
        emitted_codes = [p["postal_code"] for p in bundle["postal_areas"]]
        self.assertEqual(emitted_codes, ["00100", "00500"])
        self.assertEqual(bundle["postal_areas"][0]["area_name"], "Colombo 01 - Fort")
        self.assertTrue(bundle["postal_areas"][0]["is_active"])
        self.assertEqual(bundle["postal_areas"][0]["import_version"], "2026.11.1")

        # Report summary checks
        self.assertEqual(report["summary"]["imported"]["postal_areas"], 2)
        self.assertEqual(report["summary"]["rejected"]["postal_areas"], 2)
        self.assertEqual(report["summary"]["conflicts"]["postal_areas"], 1)

        rejected_codes = {item["postal_code"] for item in report["rejected"]}
        self.assertEqual(rejected_codes, {"123", "99999"})
        self.assertEqual(report["conflicts"][0]["postal_code"], "00300")


if __name__ == "__main__":
    unittest.main()
