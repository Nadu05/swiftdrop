package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.District;
import com.swiftdrop.organization.entity.DsDivision;
import com.swiftdrop.organization.entity.PostalArea;
import com.swiftdrop.organization.entity.Province;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:postal_area_repo_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=true",
        "spring.flyway.url=jdbc:h2:mem:postal_area_repo_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.flyway.user=sa",
        "spring.flyway.password=",
        "spring.flyway.locations=classpath:db/migration"
})
class PostalAreaRepositoryTest {

    @Autowired
    private ProvinceRepository provinceRepository;

    @Autowired
    private DistrictRepository districtRepository;

    @Autowired
    private DsDivisionRepository dsDivisionRepository;

    @Autowired
    private PostalAreaRepository postalAreaRepository;

    private Province western;
    private Province central;
    private District colombo;
    private District kandy;
    private DsDivision colomboDs;

    @BeforeEach
    void setUp() {
        western = saveProvince("WP", "Western");
        central = saveProvince("CP", "Central");
        colombo = saveDistrict("COL", "Colombo", western);
        kandy = saveDistrict("KDY", "Kandy", central);
        colomboDs = saveDsDivision("DS-COL-01", "Colombo DS", colombo);

        savePostalArea("00100", "Colombo 01 - Fort", western, colombo, colomboDs, true);
        savePostalArea("00300", "Colombo 03 - Kollupitiya", western, colombo, null, true);
        savePostalArea("20000", "Kandy City", central, kandy, null, true);
        savePostalArea("00900", "Inactive Area", western, colombo, colomboDs, false);
    }

    @Test
    @DisplayName("searchActivePostalAreas with all null filters returns active postal areas sorted by code including null dsDivision")
    void shouldReturnAllActivePostalAreasWhenAllFiltersNull() {
        List<PostalArea> results = postalAreaRepository.searchActivePostalAreas(null, null, null, null, null);

        assertThat(results)
                .extracting(PostalArea::getPostalCode)
                .containsExactly("00100", "00300", "20000");
        assertThat(results.get(0).getProvince().getName()).isEqualTo("Western");
        assertThat(results.get(0).getDistrict().getName()).isEqualTo("Colombo");
        assertThat(results.get(0).getDsDivision().getName()).isEqualTo("Colombo DS");
        assertThat(results.get(1).getDsDivision()).isNull();
    }

    @Test
    @DisplayName("searchActivePostalAreas filters by province, district, dsDivision, and exact postalCode")
    void shouldFilterByHierarchyAndPostalCode() {
        assertThat(postalAreaRepository.searchActivePostalAreas(central.getId(), null, null, null, null))
                .extracting(PostalArea::getPostalCode)
                .containsExactly("20000");

        assertThat(postalAreaRepository.searchActivePostalAreas(null, colombo.getId(), null, null, null))
                .extracting(PostalArea::getPostalCode)
                .containsExactly("00100", "00300");

        assertThat(postalAreaRepository.searchActivePostalAreas(null, null, colomboDs.getId(), null, null))
                .extracting(PostalArea::getPostalCode)
                .containsExactly("00100");

        assertThat(postalAreaRepository.searchActivePostalAreas(null, null, null, "00300", null))
                .extracting(PostalArea::getPostalCode)
                .containsExactly("00300");
    }

    @Test
    @DisplayName("searchActivePostalAreas performs case-insensitive partial search on areaName and postalCode and ignores blank search")
    void shouldSearchCaseInsensitivelyAndIgnoreBlankSearch() {
        assertThat(postalAreaRepository.searchActivePostalAreas(null, null, null, null, "  fort "))
                .extracting(PostalArea::getPostalCode)
                .containsExactly("00100");

        assertThat(postalAreaRepository.searchActivePostalAreas(null, null, null, null, "003"))
                .extracting(PostalArea::getPostalCode)
                .containsExactly("00300");

        assertThat(postalAreaRepository.searchActivePostalAreas(null, null, null, null, "   "))
                .extracting(PostalArea::getPostalCode)
                .containsExactly("00100", "00300", "20000");
    }

    private Province saveProvince(String code, String name) {
        Province p = new Province();
        p.setCode(code);
        p.setName(name);
        return provinceRepository.save(p);
    }

    private District saveDistrict(String code, String name, Province province) {
        District d = new District();
        d.setCode(code);
        d.setName(name);
        d.setProvince(province);
        return districtRepository.save(d);
    }

    private DsDivision saveDsDivision(String code, String name, District district) {
        DsDivision ds = new DsDivision();
        ds.setCode(code);
        ds.setName(name);
        ds.setDistrict(district);
        return dsDivisionRepository.save(ds);
    }

    private PostalArea savePostalArea(
            String code,
            String areaName,
            Province province,
            District district,
            DsDivision dsDivision,
            boolean active
    ) {
        PostalArea pa = new PostalArea();
        pa.setPostalCode(code);
        pa.setAreaName(areaName);
        pa.setProvince(province);
        pa.setDistrict(district);
        pa.setDsDivision(dsDivision);
        pa.setActive(active);
        pa.setSourceName("test-source");
        pa.setSourceReference("test-ref");
        pa.setImportVersion("1.0");
        return postalAreaRepository.save(pa);
    }
}
