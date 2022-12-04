package finalproject;

import opennlp.tools.stemmer.PorterStemmer;
import opennlp.tools.stemmer.Stemmer;
import opennlp.tools.tokenize.SimpleTokenizer;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.spark.api.java.AbstractJavaRDDLike;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaRDDLike;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.api.java.function.PairFunction;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.RowFactory;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.catalyst.expressions.GenericRowWithSchema;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructType;

import com.amazonaws.services.dynamodbv2.document.BatchWriteItemOutcome;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.PrimaryKey;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.TableWriteItems;
import com.amazonaws.services.dynamodbv2.model.AttributeDefinition;
import com.amazonaws.services.dynamodbv2.model.KeySchemaElement;
import com.amazonaws.services.dynamodbv2.model.KeyType;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.model.ResourceInUseException;
import com.amazonaws.services.dynamodbv2.model.ScalarAttributeType;
import com.amazonaws.services.dynamodbv2.model.WriteRequest;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;

public class TokenizeNews {
    static Logger logger = LogManager.getLogger(TokenizeNews.class);

    final static String tbName = "tokenizedNews";
	int row = 0;
	
	SimpleTokenizer model = SimpleTokenizer.INSTANCE;
	Stemmer stemmer = new PorterStemmer();
	DynamoDB db;


    public void uploadTokenized(DynamoDB database, JavaRDD<Row> newsData) {
        db = database;
        newsData.foreachPartition(iter -> { 
			HashSet<Item> rows = new HashSet<Item>(); 
			String tableName = this.tbName;
			while (iter.hasNext()) {
                HashSet<String> dupli = new HashSet<String>();
				Row news = iter.next();
                String[] titleTokens = model.tokenize((String) news.getAs(1));
                String[] desTokens = model.tokenize((String) news.getAs(4));
                String[] tokens = new String[titleTokens.length + desTokens.length];
                for (int i = 0; i < tokens.length; i++) {
                    while (i < titleTokens.length) {
                        tokens[i] = titleTokens[i];
                    }
                    tokens[i] = desTokens[i - titleTokens.length];
                }
                HashSet<Item> words = new HashSet<Item>(); 
                for (int j = 0; j < tokens.length; j++) {
                    tokens[j] = tokens[j].toLowerCase();
                    if (tokens[j].matches("^[a-zA-Z]*$") && !(tokens[j].equals("a") || tokens[j].equals("all") 
				        || tokens[j].equals("any") || tokens[j].equals("but") || tokens[j].equals("the"))) {
                        tokens[j] = (String) stemmer.stem(tokens[j]);
                        if (!dupli.contains(tokens[j])) {
                            dupli.add(tokens[j]);
                            Item word = new Item()
                                            .withPrimaryKey("keyword", tokens[j], "date", (String) news.getAs(5))
                                            .withString("headline", (String) news.getAs(1));
                            words.add(word);
                        }
                    }
                    if (words.size() == 25 || j == tokens.length - 1) {
                        TableWriteItems writ = new TableWriteItems(tableName).withItemsToPut(words);
                        BatchWriteItemOutcome ret = db.batchWriteItem(writ);
                        Map<String, List<WriteRequest>> leftover = ret.getUnprocessedItems();
                        if (leftover != null && leftover.size() != 0) {
                            db.batchWriteItemUnprocessed(leftover);	
                        }
                        words = new HashSet<Item>();
                    }
                }
			}
		});

    }

}