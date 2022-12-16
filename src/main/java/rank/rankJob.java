package rank;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Calendar;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.lang.Long;
import java.text.SimpleDateFormat;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.spark.api.java.AbstractJavaRDDLike;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.rdd.RDD;
import org.apache.spark.api.java.JavaRDDLike;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.api.java.function.PairFunction;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.RowFactory;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.catalyst.expressions.GenericRowWithSchema;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructType;

import com.amazonaws.services.applicationdiscovery.model.ResourceNotFoundException;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughputExceededException;
import com.amazonaws.services.dynamodbv2.document.BatchWriteItemOutcome;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.TableWriteItems;
import com.amazonaws.services.dynamodbv2.document.UpdateItemOutcome;
import com.amazonaws.services.dynamodbv2.document.api.UpdateItemApi;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.model.AttributeDefinition;
import com.amazonaws.services.dynamodbv2.model.KeySchemaElement;
import com.amazonaws.services.dynamodbv2.model.KeyType;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.model.ResourceInUseException;
import com.amazonaws.services.dynamodbv2.model.ScalarAttributeType;
import com.amazonaws.services.dynamodbv2.model.WriteRequest;
import com.amazonaws.services.dynamodbv2.model.ScanResult;
import com.amazonaws.services.dynamodbv2.model.ScanRequest;
import com.amazonaws.services.dynamodbv2.document.Index;
import com.amazonaws.services.dynamodbv2.document.spec.QuerySpec;
import com.amazonaws.services.dynamodbv2.document.QueryOutcome;
import com.amazonaws.services.dynamodbv2.document.ItemCollection;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;


import com.google.gson.*;
import storage.DynamoConnector;
import storage.SparkConnector;
import scala.Tuple2;
import scala.Tuple3;
import finalproject.LoadNews;

public class rankJob {
	private static final long serialVersionUID = 1L;

	/**
	 * Connection to Apache Spark
	 */
	SparkSession spark;
	JavaSparkContext context;
	private boolean useBacklinks;
	private String source;
	private String categoryEdgeURL = "s3://nets2120-news/newsRank/news_category_count.csv";
	DynamoDB db;
	Table news;

    /**
	 * Initialize the database connection and open the file
	 * 
	 * @throws IOException
	 * @throws InterruptedException 
	 * @throws DynamoDbException 
	 */
	public void initialize() throws IOException, InterruptedException {
		System.out.println("Connecting to Spark...");
		spark = SparkConnector.getSparkConnection();
		context = SparkConnector.getSparkContext();
		System.out.println("Connecting to DynamoDB...");
		db = DynamoConnector.getConnection("https://dynamodb.us-east-1.amazonaws.com");
		
		System.out.println("Connected!");
	}

    /**
	 * Fetch the social network from the S3 path, and create a (followed, follower) edge graph
	 * 
	 * @param filePath
	 * @return JavaPairRDD: (followed: int, follower: int)
	 */
	JavaPairRDD<String,Double> getCategoryWeight(String filePath) {
		// TODO Your code from ComputeRanks here
		String tablename = "newsCount";
		AmazonDynamoDB client = AmazonDynamoDBClientBuilder.standard().build();
		ScanRequest scanRequest = new ScanRequest()
    								.withTableName(tablename);
		ScanResult scanResult = client.scan(scanRequest);
		List<String[]> rowOfInterest = scanResult.getItems().parallelStream()
						.map(line -> {
							String[] inter = new String[2];
							inter[0] = line.get("category").getS();
							inter[1] = line.get("count").getN().toString();
							System.out.println("cateogory count:"+inter[0]+1/Double.parseDouble(inter[1]));
							return inter;
						})
						.collect(Collectors.toList());
		JavaRDD<String[]> inArr = context.parallelize(rowOfInterest);
		JavaPairRDD<String, Double> result = inArr
											.mapToPair(x -> new Tuple2<String, Double>(x[0], 1/Double.parseDouble(x[1])));
		
		return result;
	}

	private JavaRDD<Integer> getSinks(JavaPairRDD<Integer,Integer> graph) {
		// TODO Find the sinks in the provided graph
				JavaRDD<Integer> followed = graph.map(i -> i._1);
				JavaRDD<Integer> follower = graph.map(i -> i._2);
				
				JavaRDD<Integer> sinks = followed.subtract(follower.intersection(followed));
				
		return sinks;
	}

	JavaPairRDD<String,String> getCategoryArticleEdge() {
		String tablename = "newsData";
		AmazonDynamoDB client = AmazonDynamoDBClientBuilder.standard().build();
		ScanRequest scanRequest = new ScanRequest()
    								.withTableName(tablename);
		ScanResult scanResult = client.scan(scanRequest);
		String timeStamp = new SimpleDateFormat("yyyy-MM-dd").format(Calendar.getInstance().getTime());
		List<String[]> rowOfInterest = new ArrayList<>();
		 scanResult.getItems().parallelStream()
						.forEach(line -> {
							String dt = line.get("date").getS();
							if (dt.compareTo(timeStamp) <= 0) {
								String[] inter = new String[2];
								inter[0] = line.get("headline").getS();
								inter[1] = line.get("category").getS();
								//System.out.println("news count:"+inter[0]+inter[1]+ dt);
								rowOfInterest.add(inter);
							}
						});
						//.collect(Collectors.toList());
		JavaRDD<String[]> inArr = context.parallelize(rowOfInterest);
		JavaPairRDD<String, String> result = inArr
											.mapToPair(x -> new Tuple2<String, String>(x[0], x[1]));
		return result;
		
	}

	JavaPairRDD<String, String> getInteretsEdge() {
		String tablename = "interests";
		AmazonDynamoDB client = AmazonDynamoDBClientBuilder.standard().build();
		ScanRequest scanRequest = new ScanRequest()
    								.withTableName(tablename);
		ScanResult scanResult = client.scan(scanRequest);
		List<String[]> rowOfInterest = scanResult.getItems().parallelStream()
						.map(line -> {
							String[] inter = new String[2];
							inter[0] = line.get("username").getS();
							inter[1] = line.get("interest").getS();
							System.out.println("interest:"+inter[0]+inter[1]);
							return inter;// Make Row with Schema
						})
						.collect(Collectors.toList());
		JavaRDD<String[]> inArr = context.parallelize(rowOfInterest);
		JavaPairRDD<String, String> result = inArr
											.mapToPair(x -> new Tuple2<String, String>(x[0], x[1]));
		
		return result;
	}

	JavaPairRDD<String, String> getNewsLikeEdge() {
		String tablename = "likeNews";
		AmazonDynamoDB client = AmazonDynamoDBClientBuilder.standard().build();
		ScanRequest scanRequest = new ScanRequest()
    								.withTableName(tablename);
		ScanResult scanResult = client.scan(scanRequest);
		List<String[]> rowOfInterest = scanResult.getItems().parallelStream()
						.map(line -> {
							String[] news = new String[2];
							news[0] = line.get("username").getS();
							news[1] = line.get("headline").getS();
							System.out.println("newslike:"+news[0]+news[1]);
							return news;// Make Row with Schema
						})
						.collect(Collectors.toList());
		JavaRDD<String[]> inArr = context.parallelize(rowOfInterest);
		JavaPairRDD<String, String> result = inArr
											.mapToPair(x -> new Tuple2<String, String>(x[0], x[1]));
		
		return result;
	}

	JavaPairRDD<String, String> getFriendsEdge() {
		String tablename = "friends";
		AmazonDynamoDB client = AmazonDynamoDBClientBuilder.standard().build();
		DynamoDB dynamoDB = new DynamoDB(client);

		Table table = dynamoDB.getTable(tablename);
		Index index = table.getIndex("status-index");
		Map<String, String> nm = new HashMap<String, String>();
		nm.put("#v_name", "status");

		QuerySpec spec = new QuerySpec()
			.withKeyConditionExpression("#v_name = :v_status")
			.withNameMap(nm)
			.withValueMap(new ValueMap()
				.withString(":v_status", "true"));

		ItemCollection<QueryOutcome> items = index.query(spec);
		List<String[]> friends = new ArrayList<>();
		Iterator<Item> iter = items.iterator();
		while (iter.hasNext()) {
			Item f = iter.next();
			System.out.println(f);
			String[] row = new String[2];
			row[0] = f.get("accepter").toString();
			row[1] = f.get("asker").toString();
			System.out.println("freinds"+row[0] + "and" + row[1]);
			friends.add(row);
		}
		JavaRDD<String[]> inArr = context.parallelize(friends);
		JavaPairRDD<String, String> result = inArr
											.mapToPair(x -> new Tuple2<String, String>(x[0], x[1]));
		
		return result;
	}


	public void run(String username) {
		
		JavaPairRDD<String, String> UserEdge = getFriendsEdge();
		JavaPairRDD<String, String> InterestEdge = getInteretsEdge();
		JavaPairRDD<String, String> NewsLikeEdge = getNewsLikeEdge(); // user -> hd
		JavaPairRDD<String, Double> categoryNodeWeight = getCategoryWeight(categoryEdgeURL);
		JavaPairRDD<String, String> CategoryNewsEdge = getCategoryArticleEdge(); // hd -> ct

		JavaPairRDD<String, String> allUserEdge = UserEdge
				.union(UserEdge.mapToPair(x-> new Tuple2<String, String>(x._2, x._1)))
				.distinct();
		
		// news -> sth
		JavaPairRDD<String, String> allNewsEdge = NewsLikeEdge
				.union(CategoryNewsEdge.mapToPair(x -> new Tuple2<String, String>(x._2, x._1)))
				.distinct();

		JavaPairRDD<String, Tuple2<String, Double>> catEdgeTransfer = CategoryNewsEdge
				.join(categoryNodeWeight);

		// (news from, (to, weight))
		JavaPairRDD<String, Tuple2<String, Double>> newsEdgeTransfer = allNewsEdge
				.join(
					allNewsEdge
					.mapToPair(x -> new Tuple2<String, Integer>(x._1, 1))
				    //.union(CategoryNewsEdge.mapToPair(x -> new Tuple2<String, Integer>(x._1, 1)) 
					.reduceByKey((x, y) -> x + y)
					.mapToPair(x -> new Tuple2<String, Double>(x._1, (1.0/x._2))));

		
		JavaPairRDD<String, Tuple2<String, Double>> userFriendEdgeTransfer = allUserEdge
				.join(allUserEdge
					.mapToPair(x -> new Tuple2<String, Integer>(x._1, 1)) 
					.reduceByKey((x, y) -> x + y)
					.mapToPair(x -> new Tuple2<String, Double>(x._1, (0.3/x._2))));

		JavaPairRDD<String, Tuple2<String, Double>> userInterestEdgeTransfer = InterestEdge
				.join(InterestEdge
					.mapToPair(x -> new Tuple2<String, Integer>(x._1, 1)) 
					.reduceByKey((x, y) -> x + y)
					.mapToPair(x -> new Tuple2<String, Double>(x._1, (0.3/x._2))));
		
		// for user, article edge
		JavaPairRDD<String, Tuple2<String, Double>> userNewsEdgeTransfer =  NewsLikeEdge
				.join(NewsLikeEdge
					.mapToPair(x -> new Tuple2<String, Integer>(x._1, 1)) 
					.reduceByKey((x, y) -> x + y)
					.mapToPair(x -> new Tuple2<String, Double>(x._1, (0.4/x._2))));

		JavaPairRDD<String, Tuple2<String, Double>> userEdgeTransfer = userNewsEdgeTransfer
					.union(userFriendEdgeTransfer)
					.union(userInterestEdgeTransfer);
					//.distinct();

		JavaPairRDD<String, Tuple2<String, Double>> EdgeTransfer = catEdgeTransfer
					.union(newsEdgeTransfer)
					.union(userEdgeTransfer)
					//.distinct()
					.mapToPair(x -> new Tuple2<String, Tuple2<String, Double>>(x._2._1, new Tuple2<String, Double>(x._1, x._2._2)));	
					
		JavaPairRDD<String, String> network = allNewsEdge
					.union(allUserEdge)
					.union(CategoryNewsEdge)
					.union(CategoryNewsEdge.mapToPair(x -> new Tuple2<String, String>(x._2, x._1)))
					.union(InterestEdge)
					.union(InterestEdge.mapToPair(x-> new Tuple2<String, String>(x._2, x._1)))
					.union(NewsLikeEdge)
					.union(NewsLikeEdge.mapToPair(x-> new Tuple2<String, String>(x._2, x._1)));

		JavaPairRDD<String, Tuple2<String, Double>> userNode = allUserEdge
					.map(i -> i._1)
					.distinct()
					.mapToPair(x -> {
					if (x.compareTo(username) == 0) 
						return new Tuple2<String, Tuple2<String, Double>> (x , new Tuple2<String, Double> ("u", 1.0));
					else 
						return new Tuple2<String, Tuple2<String, Double>> (x , new Tuple2<String, Double> ("u", 0.0));
					}); 
		
		JavaPairRDD<String, Tuple2<String, Double>> categoryNode = CategoryNewsEdge
					.map(i -> i._2)
					.mapToPair(x -> new Tuple2<String, Tuple2<String, Double>> (x , new Tuple2<String, Double> ("c", 0.0)));

		JavaPairRDD<String, Tuple2<String, Double>> newsNode = CategoryNewsEdge
					.map(i -> i._1)
					.mapToPair(x -> new Tuple2<String, Tuple2<String, Double>> (x , new Tuple2<String, Double> ("a", 0.0)));
		
		JavaPairRDD<String, Tuple2<String, Double>> rank = userNode
					.union(newsNode)
					.union(categoryNode)
					.distinct();

		userNode.collect().stream()
					.forEach(item ->
				{System.out.println(item._1 + " -> " + item._2._2);
				});
					//.forEach(x->System.out.println(x._1 + "," + x._2._2));
		EdgeTransfer.mapToPair(x -> new Tuple2<>(x._2._2, new Tuple2<>(x._1, x._2._1))).sortByKey(false).collect().stream().limit(15)
					.forEach(item ->
				{System.out.println(item._1 + " === " + item._2._1 + "to<-from" + item._2._2);
				});


		int iMax = 3;
		int count = 0;
		double dMax = 0.001;		
		double delta = Integer.MAX_VALUE; 

		while (delta > dMax && count < iMax) {
			JavaPairRDD<String, Tuple2<Tuple2<String,Double>, Tuple2<String,Double>>> propagateRank = EdgeTransfer// to->from, transfer.join(EdgeTransfer
					.mapToPair(x -> new Tuple2<>(x._2._1, new Tuple2<>(x._1, x._2._2))) 
					.join(rank); // self, flag, weight

					// 받는 사람 잘 구분하기.. 여기가 문제인듯

			JavaPairRDD<String, Tuple2<String,Double>> interMediateRank = propagateRank
					.mapToPair(x -> new Tuple2<String, Tuple2<String,Double>> 
					(x._2._1._1, new Tuple2<String, Double> (x._2._2._1, x._2._2._2 * x._2._1._2)));	//x._2._1._1

			interMediateRank.mapToPair(x -> new Tuple2<>(x._2._2, x._1)).sortByKey(false).collect().stream().limit(6)
					.forEach(item ->
				{System.out.println(item._1 + "interm === " + item._2);
				});

			JavaPairRDD<String, Double> sum  = interMediateRank
					.mapToPair(x -> new Tuple2<String, Double> (x._1, x._2._2))
					.reduceByKey((x, y) -> x+y )
					.mapToPair(x -> { if (x._2 > 1.0) {return new Tuple2<>(x._1, 1.0);} else {return new Tuple2<>(x._1, x._2);}});

			sum.mapToPair(x -> new Tuple2<>(x._2, x._1)).sortByKey(false).collect().stream().limit(6)
					.forEach(item ->
				{System.out.println(item._1 + "sum === " + item._2);
				});
			
			JavaPairRDD<String, Tuple2<String,Double>> normalizedRank = interMediateRank
					//.mapToPair(x -> new Tuple2<> (x._2._1, new Tuple2<>(x._1, x._2._2)))
					.join(sum)
					.mapToPair(x -> new Tuple2<String, Tuple2<String,Double>> 
						(x._1, new Tuple2<String, Double> (x._2._1._1, x._2._2)));

			normalizedRank.mapToPair(x -> new Tuple2<>(x._2._2, x._1)).sortByKey(false).collect().stream().limit(6)
					.forEach(item ->
				{System.out.println(item._1 + "normal === " + item._2);
				});

			delta = rank
					//.mapToPair(x -> new Tuple2<Tuple2<String, String>, Double> (new Tuple2<String, String>(x._1, x._2._1), x._2._2))
					.join(normalizedRank
						//.mapToPair(x -> new Tuple2<Tuple2<String, String>, Double> (new Tuple2<String, String>(x._1, x._2._1), x._2._2))
						)
					.mapToPair(item -> new Tuple2<Double, String>
										(Math.abs(item._2._2._2 - item._2._1._2), item._1))
					.sortByKey(false).first()._1;

			if (count > 8) {
				userNode = userNode.filter( x -> x._2._2 >= 0.5);
			}
			
			count++;
			rank = normalizedRank.distinct();
			System.out.println("Round " + count + " delta : " + delta);			
		}

		db = DynamoConnector.getConnection("https://dynamodb.us-east-1.amazonaws.com");
		DynamoDB conn = DynamoConnector.getConnection("https://dynamodb.us-east-1.amazonaws.com");

		rank
		.mapToPair(x -> new Tuple2<>(x._2._1, new Tuple2<>(x._1, x._2._2)))
		.filter(x -> x._1.compareTo("a") == 0)
		.mapToPair(x -> new Tuple2<>(x._2._2, new Tuple2<>(x._1, x._2._1)))
		.sortByKey(false)
		.collect().stream()
		.limit(10).forEach(item ->{
			System.out.println(item._2._2 + " -> " + item._1);
		});

		/*Item newsItem = new Item()
							.withPrimaryKey("username", username, "rank", dt)
							.withString("category", (String) news.getAs(0));*/
		// upload it to dynamodb
		
		
	}

	public void shutdown() {
		DynamoConnector.shutdown();
		if (spark != null)
			spark.close();
	}

	public static void main(String[] args) {
		final rankJob ln = new rankJob();
		try {
			ln.initialize();
			ln.run(args[0]);
			
		} catch (final IOException ie) {
			ie.printStackTrace();
		} catch (final DynamoDbException e) {
			e.printStackTrace();
		} catch (final InterruptedException e) {
			e.printStackTrace();
		} finally {
			ln.shutdown();
		}
	}

    

}
