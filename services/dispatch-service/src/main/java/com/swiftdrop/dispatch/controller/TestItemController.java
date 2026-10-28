package com.swiftdrop.dispatch.controller;

import com.swiftdrop.dispatch.dto.TestItemRequest;
import com.swiftdrop.dispatch.dto.TestItemResponse;
import com.swiftdrop.dispatch.service.TestItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/test-items", "/test-items"})
@Tag(name = "Dispatch Test Items", description = "Test endpoints for dispatch service infrastructure")
public class TestItemController {

    private final TestItemService service;

    public TestItemController(TestItemService service) {
        this.service = service;
    }

    @PostMapping
    @Operation(summary = "Create test item")
    public ResponseEntity<TestItemResponse> create(@Valid @RequestBody TestItemRequest request) {
        return new ResponseEntity<>(service.create(request), HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "List all test items")
    public ResponseEntity<List<TestItemResponse>> findAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get test item by ID")
    public ResponseEntity<TestItemResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update test item")
    public ResponseEntity<TestItemResponse> update(@PathVariable Long id, @Valid @RequestBody TestItemRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete test item")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
