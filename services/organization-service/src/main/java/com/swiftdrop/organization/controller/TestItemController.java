package com.swiftdrop.organization.controller;

import com.swiftdrop.organization.dto.TestItemRequest;
import com.swiftdrop.organization.dto.TestItemResponse;
import com.swiftdrop.organization.service.TestItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/test-items", "/test-items"})
@Tag(name = "Test Items", description = "Infrastructure verification endpoints")
public class TestItemController {
    private final TestItemService service;
    public TestItemController(TestItemService service) { this.service = service; }

    @GetMapping
    @Operation(summary = "List all test items")
    public ResponseEntity<List<TestItemResponse>> findAll() { return ResponseEntity.ok(service.findAll()); }

    @GetMapping("/{id}")
    @Operation(summary = "Get a test item by ID")
    public ResponseEntity<TestItemResponse> findById(@PathVariable Long id) { return ResponseEntity.ok(service.findById(id)); }

    @PostMapping
    @Operation(summary = "Create a new test item")
    public ResponseEntity<TestItemResponse> create(@Valid @RequestBody TestItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing test item")
    public ResponseEntity<TestItemResponse> update(@PathVariable Long id, @Valid @RequestBody TestItemRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a test item")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.delete(id); return ResponseEntity.noContent().build(); }
}
