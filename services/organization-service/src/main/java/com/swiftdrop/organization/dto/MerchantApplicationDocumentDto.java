package com.swiftdrop.organization.dto;

public class MerchantApplicationDocumentDto {

    private String id;
    private String type;
    private String title;
    private String fileName;
    private String fileSize;
    private String uploadedAt;
    private String status;

    public MerchantApplicationDocumentDto() {}

    public MerchantApplicationDocumentDto(String id, String type, String title,
                                          String fileName, String fileSize,
                                          String uploadedAt, String status) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.fileName = fileName;
        this.fileSize = fileSize;
        this.uploadedAt = uploadedAt;
        this.status = status;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getFileSize() { return fileSize; }
    public void setFileSize(String fileSize) { this.fileSize = fileSize; }

    public String getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(String uploadedAt) { this.uploadedAt = uploadedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}

