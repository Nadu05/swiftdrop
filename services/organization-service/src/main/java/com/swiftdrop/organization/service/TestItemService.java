package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.TestItemRequest;
import com.swiftdrop.organization.dto.TestItemResponse;
import com.swiftdrop.organization.entity.TestItem;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.TestItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@Transactional
public class TestItemService {
    private final TestItemRepository repository;
    public TestItemService(TestItemRepository repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public List<TestItemResponse> findAll() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }
    @Transactional(readOnly = true)
    public TestItemResponse findById(Long id) {
        return toResponse(repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("TestItem", id)));
    }
    public TestItemResponse create(TestItemRequest request) {
        TestItem item = new TestItem();
        item.setName(request.getName());
        item.setDescription(request.getDescription());
        item.setStatus(request.getStatus() != null ? request.getStatus() : "ACTIVE");
        return toResponse(repository.save(item));
    }
    public TestItemResponse update(Long id, TestItemRequest request) {
        TestItem item = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("TestItem", id));
        item.setName(request.getName());
        item.setDescription(request.getDescription());
        if (request.getStatus() != null) item.setStatus(request.getStatus());
        return toResponse(repository.save(item));
    }
    public void delete(Long id) {
        if (!repository.existsById(id)) throw new ResourceNotFoundException("TestItem", id);
        repository.deleteById(id);
    }
    private TestItemResponse toResponse(TestItem item) {
        return new TestItemResponse(item.getId(), item.getName(), item.getDescription(), item.getStatus(), item.getCreatedAt(), item.getUpdatedAt());
    }
}
