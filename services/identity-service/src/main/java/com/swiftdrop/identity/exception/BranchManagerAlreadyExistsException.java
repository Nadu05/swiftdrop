package com.swiftdrop.identity.exception;

public class BranchManagerAlreadyExistsException extends RuntimeException {
    public BranchManagerAlreadyExistsException(Long branchId) {
        super("A branch manager account already exists for branch: " + branchId);
    }
}
