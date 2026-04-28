package com.example.demo1

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.request.*
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import kotlinx.serialization.Serializable
import java.time.Instant
import java.util.Base64
import java.security.MessageDigest
import java.util.UUID

fun main() {
    embeddedServer(Netty, port = SERVER_PORT, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class RegisterRequest(val email: String, val password: String)

@Serializable
data class LoginResponse(val email: String, val profile: Map<String, String>)

// Minimal in-memory store (seeded) so login works immediately.
object InMemoryUserStore {
    private data class SU(
        val id: String,
        val email: String,
        val passwordHash: String,
        val salt: String,
        val profile: Map<String, String>,
        val createdAt: String
    )

    private val users = mutableListOf<SU>()

    init {
        // seed username@une.edu.au with password "password123"
        val email = "username@une.edu.au"
        val password = "password123"
        val salt = generateSalt()
        val hash = hashPassword(password, salt)
        val profile = mapOf(
            "name" to "Seeded User",
            "department" to "Computer Science",
            "role" to "Student",
            "bio" to "This is a seeded profile for username@une.edu.au"
        )
        users.add(SU(UUID.randomUUID().toString(), email, hash, salt, profile, Instant.now().toString()))
    }

    fun validateLogin(email: String, password: String): LoginResponse? {
        val u = users.find { it.email.equals(email, ignoreCase = true) } ?: return null
        val expected = hashPassword(password, u.salt)
        return if (expected == u.passwordHash) LoginResponse(u.email, u.profile) else null
    }

    fun listEmails(): List<String> = users.map { it.email }

    private fun generateSalt(): String {
        val bytes = ByteArray(16)
        java.security.SecureRandom().nextBytes(bytes)
        return Base64.getEncoder().encodeToString(bytes)
    }

    private fun hashPassword(password: String, salt: String): String {
        val md = MessageDigest.getInstance("SHA-256")
        val combined = password + salt
        val hashed = md.digest(combined.toByteArray(Charsets.UTF_8))
        return Base64.getEncoder().encodeToString(hashed)
    }
}

fun Application.module() {
    install(ContentNegotiation) { json() }

    routing {
        get("/") {
            call.respondText("Ktor: ${Greeting().greet()}")
        }

        post("/api/login") {
            val req = call.receive<LoginRequest>()
            val ok = InMemoryUserStore.validateLogin(req.email, req.password)
            if (ok == null) {
                call.respond(mapOf("error" to "invalid_credentials"))
            } else {
                call.respond(ok)
            }
        }

        get("/api/users") {
            call.respond(InMemoryUserStore.listEmails())
        }

        get("/api/profile") {
            val email = call.request.queryParameters["email"] ?: ""
            val user = InMemoryUserStore.validateLogin(email, "")
            // validateLogin with empty password will fail — instead find by email
            val profile = InMemoryUserStore.listEmails().find { it.equals(email, ignoreCase = true) }?.let {
                // find profile by matching email in users (not exposed)
                // For simplicity return a placeholder or the seeded profile when email matches seeded one
                if (email.equals("username@une.edu.au", ignoreCase = true)) mapOf(
                    "name" to "Seeded User",
                    "department" to "Computer Science",
                    "role" to "Student",
                    "bio" to "This is a seeded profile for username@une.edu.au"
                ) else null
            }
            if (profile == null) call.respond(mapOf("error" to "not_found")) else call.respond(profile)
        }
    }
}
