from django.db import models

class GoldenRule(models.Model):
    rule_text = models.TextField()
    example_bad = models.TextField(blank=True, null=True)
    example_good = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=50, default="general")
    created_at = models.DateTimeField(auto_now_add=True)
    score = models.IntegerField(default=1) # Increments if users agree with this rule

    def __str__(self):
        return self.rule_text[:50]