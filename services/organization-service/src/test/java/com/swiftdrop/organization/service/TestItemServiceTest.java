package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.TestItemRequest;
import com.swiftdrop.organization.dto.TestItemResponse;
import com.swiftdrop.organization.entity.TestItem;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.TestItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TestItemServiceTest {

    @Mock
    private TestItemRepository repository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private TestItemService service;

    private TestItem testItem;

    @BeforeEach
    void setUp() {
        testItem = new TestItem("HQ Branch", "Main central branch", "ACTIVE");
        testItem.setId(1L);
        testItem.setCreatedAt(LocalDateTime.now());
        testItem.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should create test item successfully")
    void shouldCreateTestItem() {
        TestItemRequest request = new TestItemRequest("HQ Branch", "Main central branch", "ACTIVE");
        when(repository.save(any(TestItem.class))).thenReturn(testItem);

        TestItemResponse response = service.create(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getName()).isEqualTo("HQ Branch");
        verify(repository, times(1)).save(any(TestItem.class));
    }

    @Test
    @DisplayName("Should find all test items")
    void shouldFindAllTestItems() {
        when(repository.findAll()).thenReturn(List.of(testItem));

        List<TestItemResponse> result = service.findAll();

        assertThat(result).hasSize(1);
        verify(repository, times(1)).findAll();
    }

    @Test
    @DisplayName("Should find test item by ID")
    void shouldFindById() {
        when(repository.findById(1L)).thenReturn(Optional.of(testItem));

        TestItemResponse response = service.findById(1L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when item not found")
    void shouldThrowWhenNotFound() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Should delete test item successfully")
    void shouldDeleteTestItem() {
        when(repository.existsById(1L)).thenReturn(true);
        doNothing().when(repository).deleteById(1L);

        service.delete(1L);

        verify(repository, times(1)).deleteById(1L);
    }
}
