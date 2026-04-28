package com.example.demo1.users

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val email: String,
    val passwordHash: String,
    val salt: String,
    val profile: Map<String, String> = emptyMap(),
    val createdAt: String
)

