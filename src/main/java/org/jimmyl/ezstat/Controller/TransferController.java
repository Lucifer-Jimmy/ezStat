package org.jimmyl.ezstat.Controller;

import jakarta.validation.Valid;
import org.jimmyl.ezstat.DTO.TransferResponse;
import org.jimmyl.ezstat.DTO.TransferSaveRequest;
import org.jimmyl.ezstat.Entity.User;
import org.jimmyl.ezstat.Service.TransferService;
import org.jimmyl.ezstat.Service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transfers")
public class TransferController {

    private final TransferService transferService;
    private final UserService userService;

    public TransferController(TransferService transferService, UserService userService) {
        this.transferService = transferService;
        this.userService = userService;
    }

    @GetMapping
    public List<TransferResponse> list() {
        User current = userService.getCurrentAuthenticatedUser();
        return transferService.list(current);
    }

    @PostMapping
    public ResponseEntity<TransferResponse> create(@Valid @RequestBody TransferSaveRequest request) {
        User current = userService.getCurrentAuthenticatedUser();
        return ResponseEntity.status(HttpStatus.CREATED).body(transferService.create(current, request));
    }
}

