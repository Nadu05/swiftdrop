package com.swiftdrop.identity.service;

import com.swiftdrop.identity.dto.TestItemRequest;
import com.swiftdrop.identity.dto.TestItemResponse;
import com.swiftdrop.identity.entity.TestItem;
import com.swiftdrop.identity.exception.ResourceNotFoundException;
import com.swiftdrop.identity.repository.TestItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TestItemService {

    private final TestItemRepository repository;

    public TestItemService(TestItemRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<TestItemResponse> findAll() {
        return repository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TestItemResponse findById(Long id) {
        TestItem item = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TestItem", id));
        return toResponse(item);
    }

    public TestItemResponse create(TestItemRequest request) {
        TestItem item = new TestItem();
        item.setName(request.getName());
        item.setDescription(request.getDescription());
        item.setStatus(request.getStatus() != null ? request.getStatus() : "ACTIVE");
        return toResponse(repository.save(item));
    }

    public TestItemResponse update(Long id, TestItemRequest request) {
        TestItem item = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TestItem", id));
        item.setName(request.getName());
        item.setDescription(request.getDescription());
        if (request.getStatus() != null) {
            item.setStatus(request.getStatus());
        }
        return toResponse(repository.save(item));
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("TestItem", id);
        }
        repository.deleteById(id);
    }

    private TestItemResponse toResponse(TestItem item) {
        return new TestItemResponse(
                item.getId(),
                item.getName(),
                item.getDescription(),
                item.getStatus(),
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
    }
}
