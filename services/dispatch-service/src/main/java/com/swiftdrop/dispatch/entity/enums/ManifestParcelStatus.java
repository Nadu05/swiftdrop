package com.swiftdrop.dispatch.entity.enums;

public enum ManifestParcelStatus {
    MANIFESTED,
    DISPATCHED,
    RECEIVED,
    MISSING,
    DAMAGED,
    REMOVED;

    public boolean blocksConflictingManifest() {
        return this == MANIFESTED || this == DISPATCHED;
    }
}

