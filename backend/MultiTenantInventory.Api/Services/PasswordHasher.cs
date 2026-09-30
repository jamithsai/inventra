using System.Security.Cryptography;

namespace MultiTenantInventory.Api.Services;

public static class PasswordHasher
{
    private const int SaltSize = 16; // 128-bit salt
    private const int KeySize = 32;  // 256-bit subkey
    private const int Iterations = 100000;
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;
    private const char SegmentDelimiter = ':';

    public static string Hash(string password)
    {
        if (string.IsNullOrEmpty(password))
            throw new ArgumentNullException(nameof(password));

        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Iterations,
            Algorithm,
            KeySize
        );

        return string.Join(
            SegmentDelimiter,
            Convert.ToHexString(hash),
            Convert.ToHexString(salt),
            Iterations,
            Algorithm.Name
        );
    }

    public static bool Verify(string password, string hashString)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(hashString))
            return false;

        var segments = hashString.Split(SegmentDelimiter);
        if (segments.Length != 4)
            return false;

        try
        {
            byte[] hash = Convert.FromHexString(segments[0]);
            byte[] salt = Convert.FromHexString(segments[1]);
            int iterations = int.Parse(segments[2]);
            var algorithm = new HashAlgorithmName(segments[3]);

            byte[] inputHash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                iterations,
                algorithm,
                hash.Length
            );

            return CryptographicOperations.FixedTimeEquals(hash, inputHash);
        }
        catch
        {
            return false;
        }
    }
}
