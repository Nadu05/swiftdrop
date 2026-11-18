package com.swiftdrop.organization.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "postal_areas")
public class PostalArea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "postal_code", nullable = false, unique = true, length = 5)
    private String postalCode;

    @Column(name = "area_name", nullable = false, length = 200)
    private String areaName;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "province_id", nullable = false)
    private Province province;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "district_id", nullable = false)
    private District district;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ds_division_id")
    private DsDivision dsDivision;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "source_name", nullable = false, length = 120)
    private String sourceName;

    @Column(name = "source_reference", nullable = false, length = 120)
    private String sourceReference;

    @Column(name = "import_version", nullable = false, length = 50)
    private String importVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }
    public String getAreaName() { return areaName; }
    public void setAreaName(String areaName) { this.areaName = areaName; }
    public Province getProvince() { return province; }
    public void setProvince(Province province) { this.province = province; }
    public District getDistrict() { return district; }
    public void setDistrict(District district) { this.district = district; }
    public DsDivision getDsDivision() { return dsDivision; }
    public void setDsDivision(DsDivision dsDivision) { this.dsDivision = dsDivision; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
    public String getSourceReference() { return sourceReference; }
    public void setSourceReference(String sourceReference) { this.sourceReference = sourceReference; }
    public String getImportVersion() { return importVersion; }
    public void setImportVersion(String importVersion) { this.importVersion = importVersion; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
