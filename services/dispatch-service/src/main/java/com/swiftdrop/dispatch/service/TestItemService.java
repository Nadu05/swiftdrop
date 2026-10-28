package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.dto.TestItemRequest;
import com.swiftdrop.dispatch.dto.TestItemResponse;
import com.swiftdrop.dispatch.entity.TestItem;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.repository.TestItemRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class TestItemService {

    private final TestItemRepository repository;
    private final RabbitTemplate rabbitTemplate;

    @Value("${swiftdrop.rabbitmq.exchange:swiftdrop.events}")
    private String exchange;

    public TestItemService(TestItemRepository repository, RabbitTemplate rabbitTemplate) {
        this.repository = repository;
        this.rabbitTemplate = rabbitTemplate;
    }

    public TestItemResponse create(TestItemRequest request) {
        TestItem item = new TestItem(request.getName(), request.getDescription(), request.getStatus());
        TestItem saved = repository.save(item);
        publishEvent("dispatch.testitem.created", saved);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<TestItemResponse> findAll() {
        return repository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TestItemResponse findById(Long id) {
        TestItem item = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TestItem", id));
        return toResponse(item);
    }

    public TestItemResponse update(Long id, TestItemRequest request) {
        TestItem item = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TestItem", id));
        item.setName(request.getName());
        item.setDescription(request.getDescription());
        item.setStatus(request.getStatus());
        TestItem updated = repository.save(item);
        publishEvent("dispatch.testitem.updated", updated);
        return toResponse(updated);
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("TestItem", id);
        }
        repository.deleteById(id);
        Map<String, Object> event = new HashMap<>();
        event.put("eventType", "dispatch.testitem.deleted");
        event.put("itemId", id);
        try {
            rabbitTemplate.convertAndSend(exchange, "dispatch.testitem.deleted", event);
        } catch (Exception ignored) {
        }
    }

    private void publishEvent(String routingKey, TestItem item) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("eventType", routingKey);
            event.put("itemId", item.getId());
            event.put("name", item.getName());
            event.put("status", item.getStatus());
            rabbitTemplate.convertAndSend(exchange, routingKey, event);
        } catch (Exception ignored) {
        }
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
